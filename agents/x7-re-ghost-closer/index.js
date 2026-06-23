/**
 * x7-re-ghost-closer — Outbound HNI lead hunter (Phase 4, Blueprint 2.3)
 * -----------------------------------------------------------------------------
 * Self-contained Cloud Run service (Codex-aligned). Prospect ingest,
 * deterministic Investment-Propensity scoring, GPT-4o-mini Hinglish
 * outreach, send via tool-gateway WhatsApp, nightly 2 AM IST hunt.
 *
 *   POST /prospects/ingest   — bulk insert (CSV upload handler), dedup
 *   POST /prospects/score    — score one prospect
 *   POST /prospects/send     — compose + send a single outreach now
 *   POST /cron/hunt          — nightly batch: score → compose → send
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT) || 8086;
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const TOOL_GATEWAY = (process.env.TOOL_GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, '');
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL_OUTREACH || 'gpt-4o-mini';

const MIN_SCORE = 55, MAX_PER_BUILDER = 50, MAX_PER_RUN = 200;

const app = express();
app.use(express.json({ limit: '4mb' }));

let _sb = null;
function supabase() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}
function requireSecret(req, res, next) {
  if (!AGENT_SECRET) return next();
  if (req.header('x-agent-secret') !== AGENT_SECRET) return res.status(401).json({ ok: false, error: 'invalid agent secret' });
  next();
}
async function gatewayWhatsApp(to, body, builder_id) {
  const r = await fetch(`${TOOL_GATEWAY}/whatsapp/send/text`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET, 'x-agent-token': AGENT_SECRET } : {}) },
    body: JSON.stringify({ to, body, builder_id }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error ?? `gateway whatsapp ${r.status}`);
  return j;
}

const startedAt = Date.now();
app.get('/health', (_req, res) => res.json({ service: 'x7-re-ghost-closer', status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) }));
app.get('/health/dependencies', (_req, res) => res.json({
  service: 'x7-re-ghost-closer',
  supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  openai: Boolean(OPENAI_KEY), tool_gateway: TOOL_GATEWAY,
}));

app.use(requireSecret);

function normalizePhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.length > 10) return `+${d}`;
  return null;
}

// ---- prospect ingest ----
app.post('/prospects/ingest', async (req, res) => {
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const { builder_id, project_id, prospects, source = 'manual' } = req.body ?? {};
    if (!builder_id || !Array.isArray(prospects) || !prospects.length) return res.status(400).json({ ok: false, error: 'builder_id + prospects[] required' });
    const phones = prospects.map((p) => normalizePhone(p.phone)).filter(Boolean);
    const emails = prospects.map((p) => p.email?.toLowerCase()).filter(Boolean);
    const dedup = { phones: new Set(), emails: new Set() };
    if (phones.length) { const { data } = await sb.from('ghost_closer_prospects').select('phone').eq('builder_id', builder_id).in('phone', phones); (data ?? []).forEach((r) => dedup.phones.add(r.phone)); }
    if (emails.length) { const { data } = await sb.from('ghost_closer_prospects').select('email').eq('builder_id', builder_id).in('email', emails); (data ?? []).forEach((r) => dedup.emails.add(r.email?.toLowerCase())); }
    const rows = prospects
      .map((p) => ({ ...p, phone: normalizePhone(p.phone), email: p.email?.toLowerCase() }))
      .filter((p) => !(p.phone && dedup.phones.has(p.phone)) && !(p.email && dedup.emails.has(p.email)))
      .map((p) => ({
        builder_id, project_id: project_id ?? null, full_name: p.full_name ?? p.name, phone: p.phone ?? null, email: p.email ?? null,
        city: p.city ?? null, country: p.country ?? 'IN', is_nri: Boolean(p.is_nri), occupation: p.occupation ?? null,
        employer: p.employer ?? null, linkedin_url: p.linkedin_url ?? null, source, status: 'discovered', enrichment: p.enrichment ?? {},
      }));
    if (!rows.length) return res.json({ ok: true, inserted: 0, skipped: prospects.length });
    const { data: inserted, error } = await sb.from('ghost_closer_prospects').insert(rows).select('id');
    if (error) throw error;
    res.json({ ok: true, inserted: inserted?.length ?? 0, skipped: prospects.length - (inserted?.length ?? 0) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---- propensity scoring ----
const OCC_WEIGHT = { 'business owner': 22, entrepreneur: 22, doctor: 20, surgeon: 22, ceo: 25, founder: 25, cto: 23, vp: 20, director: 18, manager: 14, engineer: 12, developer: 12, ca: 18, lawyer: 18, professor: 14, consultant: 16, investor: 28 };
const CITY_PREMIUM = { indore: 8, bhopal: 6, jaipur: 8, lucknow: 6, nagpur: 6, surat: 7, ahmedabad: 8, pune: 9, mumbai: 10, bangalore: 10, bengaluru: 10, hyderabad: 9, chennai: 9, delhi: 10, gurgaon: 10, noida: 9 };
function scoreProspectRow(p) {
  let score = 30;
  const occ = (p.occupation ?? '').toLowerCase();
  for (const [k, v] of Object.entries(OCC_WEIGHT)) { if (occ.includes(k)) { score += v; break; } }
  if (p.is_nri) score += 18;
  score += CITY_PREMIUM[(p.city ?? '').toLowerCase()] ?? 4;
  if (p.linkedin_url) score += 4;
  if (p.enrichment?.searched_property) score += 12;
  if (p.enrichment?.prior_purchases?.length > 0) score += 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}
app.post('/prospects/score', async (req, res) => {
  try {
    const sb = supabase(); const { data: p } = await sb.from('ghost_closer_prospects').select('*').eq('id', req.body?.prospect_id).single();
    if (!p) return res.status(404).json({ ok: false, error: 'prospect not found' });
    const score = scoreProspectRow(p);
    await sb.from('ghost_closer_prospects').update({ propensity_score: score, status: 'researched' }).eq('id', p.id);
    res.json({ ok: true, propensity_score: score });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---- compose ----
async function composeOutreach({ prospect, builder, project }) {
  if (!OPENAI_KEY) {
    const hi = `${prospect.full_name} ji, ${prospect.city ?? 'aapke shahar'} mein ${builder.company_name} ka naya RERA-approved project ${project?.name ?? ''} — plots ₹${project?.price_range_min ?? 18} Lakh se shuru. 2 minute ka video bhej doon?`;
    return { subject: `${builder.company_name} — investment opportunity`, body: hi };
  }
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_KEY });
  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL, temperature: 0.6, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Senior real estate concierge. Warm, brief, Hinglish (Hindi primary). 80-120 words. Reference one specific prospect fact in line 1. Single soft CTA. JSON: { subject, body }.' },
      { role: 'user', content: JSON.stringify({ prospect: { name: prospect.full_name, city: prospect.city, occupation: prospect.occupation, is_nri: prospect.is_nri }, project: { name: project?.name, city: project?.city, starting: project?.price_range_min, rera: project?.rera_number }, builder: { company_name: builder.company_name } }) },
    ],
  });
  try { return JSON.parse(resp.choices?.[0]?.message?.content ?? '{}'); } catch { return { subject: null, body: resp.choices?.[0]?.message?.content ?? '' }; }
}

async function firstActiveProject(sb, builder_id) {
  const { data } = await sb.from('projects').select('*').eq('builder_id', builder_id).eq('status', 'active').order('launched_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function sendOne({ sb, prospect, builder, project }) {
  const { subject, body } = await composeOutreach({ prospect, builder, project });
  let external_id = null, error = null;
  try {
    if (prospect.phone) { const r = await gatewayWhatsApp(prospect.phone.replace(/^\+/, ''), body, builder.id); external_id = r.wa_message_id ?? null; }
    else throw new Error('no phone (email channel V2)');
  } catch (e) { error = e.message; }
  await sb.from('ghost_closer_outreach').insert({ prospect_id: prospect.id, builder_id: builder.id, channel: 'whatsapp', subject: subject ?? null, body, delivered: Boolean(external_id), external_id, error, sent_at: new Date().toISOString() });
  await sb.from('ghost_closer_prospects').update({ status: error ? 'discovered' : 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', prospect.id);
  return { external_id, error };
}

app.post('/prospects/send', async (req, res) => {
  try {
    const sb = supabase(); const { data: prospect } = await sb.from('ghost_closer_prospects').select('*, builder:builders(*), project:projects(*)').eq('id', req.body?.prospect_id).single();
    if (!prospect) return res.status(404).json({ ok: false, error: 'prospect not found' });
    const project = prospect.project ?? (await firstActiveProject(sb, prospect.builder_id));
    const r = await sendOne({ sb, prospect, builder: prospect.builder, project });
    res.json({ ok: !r.error, ...r });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/cron/hunt', async (req, res) => {
  const t0 = Date.now();
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    let q = sb.from('ghost_closer_prospects').select('*, builder:builders(*), project:projects(*)').in('status', ['discovered', 'researched']).order('created_at', { ascending: true }).limit(req.body?.batch_size ?? MAX_PER_RUN);
    if (req.body?.builder_id) q = q.eq('builder_id', req.body.builder_id);
    const { data: prospects } = await q;
    const perBuilder = new Map();
    let sent = 0, skipped = 0, failed = 0;
    for (const p of prospects ?? []) {
      const used = perBuilder.get(p.builder_id) ?? 0;
      if (used >= MAX_PER_BUILDER) { skipped++; continue; }
      try {
        if (p.propensity_score == null) { const s = scoreProspectRow(p); await sb.from('ghost_closer_prospects').update({ propensity_score: s, status: 'researched' }).eq('id', p.id); p.propensity_score = s; }
        if ((p.propensity_score ?? 0) < MIN_SCORE) { skipped++; continue; }
        const project = p.project ?? (await firstActiveProject(sb, p.builder_id));
        if (!project || !p.phone) { skipped++; continue; }
        const r = await sendOne({ sb, prospect: p, builder: p.builder, project });
        if (r.error) failed++; else sent++;
        perBuilder.set(p.builder_id, used + 1);
      } catch { failed++; }
    }
    const result = { ok: true, picked: prospects?.length ?? 0, sent, skipped, failed };
    if (req.body?.builder_id) { try { await sb.from('agent_runs').insert({ builder_id: req.body.builder_id, agent: 'ghost-closer', action: 'cron.hunt', input: {}, output: result, status: failed ? 'partial' : 'success', duration_ms: Date.now() - t0 }); } catch {} }
    res.json(result);
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message ?? 'internal error' }));
app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-ghost-closer', msg: 'listening', port: PORT })));
