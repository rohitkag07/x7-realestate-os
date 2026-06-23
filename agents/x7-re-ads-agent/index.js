/**
 * x7-re-ads-agent — Meta Ads autopilot (Phase 4)
 * -----------------------------------------------------------------------------
 * Self-contained Cloud Run service (Codex-aligned): single index.js,
 * x-agent-secret auth, /health + /health/dependencies. Calls the Meta
 * Marketing API directly. Blueprint Section 2.1.
 *
 *   POST /campaign/full-funnel  — provision all 4 campaign types
 *   POST /campaign/create       — one campaign type
 *   POST /campaign/status       — pause / resume / archive
 *   POST /audiences/lookalike   — past-buyers → 1% lookalike
 *   POST /capi/queue            — enqueue an offline conversion event
 *   POST /cron/insights         — daily insights pull → ad_insights
 *   POST /cron/optimize         — daily budget rebalance (CPL based)
 *   POST /cron/capi             — drain capi_events queue → Meta CAPI
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.PORT) || 8085;
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const META_BASE = 'https://graph.facebook.com/v20.0';

const app = express();
app.use(express.json({ limit: '2mb' }));

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
const token = () => { const t = process.env.META_ACCESS_TOKEN; if (!t) throw new Error('META_ACCESS_TOKEN not set'); return t; };
const adAccount = () => { const a = process.env.META_AD_ACCOUNT_ID; if (!a) throw new Error('META_AD_ACCOUNT_ID not set'); return a; };

function flatten(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) { if (v == null) continue; out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v); }
  return out;
}
async function meta(method, path, params = {}) {
  const url = new URL(`${META_BASE}${path}`);
  if (method === 'GET') {
    Object.entries({ access_token: token(), ...flatten(params) }).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString()); const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message ?? `meta ${path}`); return j;
  }
  const body = new URLSearchParams({ access_token: token(), ...flatten(params) });
  const r = await fetch(url.toString(), { method, body }); const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message ?? `meta ${path}`); return j;
}

const OBJECTIVE = { awareness: 'OUTCOME_AWARENESS', consideration: 'OUTCOME_TRAFFIC', conversion: 'OUTCOME_SALES', retargeting: 'OUTCOME_SALES', lead_gen: 'OUTCOME_LEADS', click_to_whatsapp: 'OUTCOME_ENGAGEMENT' };
const PLAN = {
  awareness:        { suffix: 'Awareness',          daily: 800,  goal: 'REACH',                radius: 20 },
  consideration:    { suffix: 'Consideration',      daily: 800,  goal: 'LINK_CLICKS',          radius: 15 },
  conversion:       { suffix: 'Click-to-WhatsApp',  daily: 1500, goal: 'CONVERSATIONS',        radius: 12 },
  retargeting:      { suffix: 'Retargeting',        daily: 500,  goal: 'OFFSITE_CONVERSIONS',  radius: 25 },
};

const startedAt = Date.now();
app.get('/health', (_req, res) => res.json({ service: 'x7-re-ads-agent', status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) }));
app.get('/health/dependencies', (_req, res) => res.json({
  service: 'x7-re-ads-agent',
  supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  meta: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
}));

app.use(requireSecret);

function buildTargeting(project, radiusKm) {
  if (!project?.latitude || !project?.longitude) throw new Error('project needs latitude+longitude');
  return {
    age_min: 25, age_max: 60,
    geo_locations: { custom_locations: [{ latitude: project.latitude, longitude: project.longitude, radius: radiusKm, distance_unit: 'kilometer', country: 'IN' }] },
    flexible_spec: [{ interests: [{ id: '6003348604581', name: 'Real estate' }, { id: '6003285795649', name: 'Real estate investing' }] }],
  };
}

async function createOne({ builder, project, type, customBudget, customRadius }) {
  if (!PLAN[type]) throw new Error(`unknown type ${type}`);
  const plan = PLAN[type];
  const sb = supabase();
  const name = `${project.name} — ${plan.suffix}`;
  const campaign = await meta('POST', `/${adAccount()}/campaigns`, { name, objective: OBJECTIVE[type], status: 'PAUSED', special_ad_categories: ['HOUSING'], buying_type: 'AUCTION' });
  const targeting = buildTargeting(project, customRadius ?? plan.radius);
  const adset = await meta('POST', `/${adAccount()}/adsets`, {
    name: `${name} — Set 1`, campaign_id: campaign.id, daily_budget: Math.round((customBudget ?? plan.daily) * 100),
    billing_event: 'IMPRESSIONS', optimization_goal: plan.goal, targeting, status: 'PAUSED',
    start_time: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  const { data: row, error } = await sb.from('ad_campaigns').insert({
    builder_id: builder.id, project_id: project.id, platform: 'meta', campaign_name: name, campaign_type: type,
    objective: plan.goal, budget_daily: customBudget ?? plan.daily, meta_campaign_id: campaign.id, meta_adset_id: adset.id,
    status: 'paused', audience: targeting, start_date: new Date().toISOString().slice(0, 10),
  }).select('*').single();
  if (error) throw error;
  return { type, ok: true, campaign_id: row.id, meta_campaign_id: campaign.id, meta_adset_id: adset.id };
}

app.post('/campaign/full-funnel', async (req, res) => {
  try {
    const { builder_id, project_id } = req.body ?? {};
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const [{ data: builder }, { data: project }] = await Promise.all([
      sb.from('builders').select('*').eq('id', builder_id).single(),
      sb.from('projects').select('*').eq('id', project_id).single(),
    ]);
    if (!builder || !project) return res.status(404).json({ ok: false, error: 'not found' });
    const created = [];
    for (const type of Object.keys(PLAN)) {
      try { created.push(await createOne({ builder, project, type })); }
      catch (e) { created.push({ type, ok: false, error: e.message }); }
    }
    await logRun(builder_id, project_id, 'campaign.full_funnel', { count: created.length }, created.every((c) => c.ok) ? 'success' : 'partial');
    res.json({ ok: true, campaigns: created });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/campaign/create', async (req, res) => {
  try {
    const { builder_id, project_id, type, daily_budget, radius_km } = req.body ?? {};
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const [{ data: builder }, { data: project }] = await Promise.all([
      sb.from('builders').select('*').eq('id', builder_id).single(),
      sb.from('projects').select('*').eq('id', project_id).single(),
    ]);
    if (!builder || !project) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, ...(await createOne({ builder, project, type, customBudget: daily_budget, customRadius: radius_km })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/campaign/status', async (req, res) => {
  try {
    const { campaign_id, status } = req.body ?? {};
    if (!campaign_id || !['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) return res.status(400).json({ ok: false, error: 'campaign_id + valid status required' });
    const sb = supabase(); const { data: c } = await sb.from('ad_campaigns').select('*').eq('id', campaign_id).single();
    if (!c) return res.status(404).json({ ok: false, error: 'campaign not found' });
    await meta('POST', `/${c.meta_campaign_id}`, { status });
    await sb.from('ad_campaigns').update({ status: status.toLowerCase() }).eq('id', campaign_id);
    res.json({ ok: true, campaign_id, status });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/audiences/lookalike', async (req, res) => {
  try {
    const { builder_id, ratio = 0.01 } = req.body ?? {};
    const sb = supabase(); const { data: builder } = await sb.from('builders').select('*').eq('id', builder_id).single();
    if (!builder) return res.status(404).json({ ok: false, error: 'builder not found' });
    const base = await meta('POST', `/${adAccount()}/customaudiences`, { name: `${builder.company_name} — Past Buyers`, subtype: 'CUSTOM', customer_file_source: 'USER_PROVIDED_ONLY' });
    const lal = await meta('POST', `/${adAccount()}/customaudiences`, { name: `${builder.company_name} — Lookalike 1%`, subtype: 'LOOKALIKE', origin_audience_id: base.id, lookalike_spec: { type: 'similarity', country: 'IN', ratio } });
    await sb.from('ad_audiences').upsert([
      { builder_id, name: `${builder.company_name} — Past Buyers`, kind: 'custom', meta_audience_id: base.id, status: 'active', spec: { source: 'leads.stage=booked' } },
      { builder_id, name: `${builder.company_name} — Lookalike 1%`, kind: 'lookalike', meta_audience_id: lal.id, status: 'active', similarity_pct: ratio * 100, spec: { ratio, country: 'IN' } },
    ], { onConflict: 'builder_id,name' });
    res.json({ ok: true, seed_audience_id: base.id, lookalike_audience_id: lal.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/capi/queue', async (req, res) => {
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const { data, error } = await sb.from('capi_events').insert(req.body ?? {}).select('*').single();
    if (error) throw error;
    res.json({ ok: true, event: data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/cron/insights', async (req, res) => {
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const { data: campaigns } = await sb.from('ad_campaigns').select('id, meta_campaign_id, status, budget_spent, leads_generated, impressions, clicks').in('status', ['active', 'paused']).limit(req.body?.limit ?? 100);
    let updated = 0, failed = 0;
    const date = new Date(); date.setDate(date.getDate() - 1);
    const snapshot_date = date.toISOString().slice(0, 10);
    for (const c of campaigns ?? []) {
      try {
        const j = await meta('GET', `/${c.meta_campaign_id}/insights`, { date_preset: req.body?.date_preset ?? 'yesterday', fields: 'spend,impressions,reach,clicks,ctr,cpm,frequency,actions' });
        const row = (j.data ?? [])[0]; if (!row) continue;
        const leads = (row.actions ?? []).find((a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value;
        const spend = Number(row.spend ?? 0), leadN = Number(leads ?? 0);
        await sb.from('ad_insights').upsert({
          campaign_id: c.id, snapshot_date, spend, impressions: Number(row.impressions ?? 0), reach: Number(row.reach ?? 0),
          clicks: Number(row.clicks ?? 0), leads: leadN, ctr: Number(row.ctr ?? 0), cpl: leadN ? spend / leadN : null,
          cpm: Number(row.cpm ?? 0), frequency: Number(row.frequency ?? 0), raw: row,
        }, { onConflict: 'campaign_id,snapshot_date' });
        await sb.from('ad_campaigns').update({
          budget_spent: Math.round((c.budget_spent ?? 0) + spend), impressions: (c.impressions ?? 0) + Number(row.impressions ?? 0),
          clicks: (c.clicks ?? 0) + Number(row.clicks ?? 0), leads_generated: (c.leads_generated ?? 0) + leadN,
          cpl: leadN ? Math.round(spend / leadN) : null, ctr: Number(row.ctr ?? 0),
        }).eq('id', c.id);
        updated++;
      } catch { failed++; }
    }
    res.json({ ok: true, picked: campaigns?.length ?? 0, updated, failed });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/cron/optimize', async (req, res) => {
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    let q = sb.from('ad_campaigns').select('*').eq('status', 'active');
    if (req.body?.builder_id) q = q.eq('builder_id', req.body.builder_id);
    const { data: campaigns } = await q;
    const byBuilder = new Map();
    for (const c of campaigns ?? []) { if (!byBuilder.has(c.builder_id)) byBuilder.set(c.builder_id, []); byBuilder.get(c.builder_id).push(c); }
    const moves = [];
    for (const [, list] of byBuilder) {
      const ranked = list.filter((c) => c.cpl != null).sort((a, b) => (a.cpl ?? 9e9) - (b.cpl ?? 9e9));
      if (ranked.length < 2) continue;
      const best = ranked[0], worst = ranked[ranked.length - 1];
      const shift = Math.round((worst.budget_daily ?? 300) * 0.2); if (shift <= 0) continue;
      const newWorst = Math.max(300, (worst.budget_daily ?? 300) - shift), newBest = (best.budget_daily ?? 300) + shift;
      try {
        if (worst.meta_adset_id) await meta('POST', `/${worst.meta_adset_id}`, { daily_budget: Math.round(newWorst * 100) });
        if (best.meta_adset_id) await meta('POST', `/${best.meta_adset_id}`, { daily_budget: Math.round(newBest * 100) });
        await sb.from('ad_campaigns').update({ budget_daily: newWorst }).eq('id', worst.id);
        await sb.from('ad_campaigns').update({ budget_daily: newBest }).eq('id', best.id);
        moves.push({ from: worst.id, to: best.id, shift });
      } catch { /* tolerate */ }
    }
    res.json({ ok: true, moves });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

const sha = (s) => createHash('sha256').update(String(s ?? '').trim().toLowerCase()).digest('hex');
const META_EVENT = { Lead: 'Lead', SiteVisitBooked: 'Schedule', SiteVisitCompleted: 'Contact', TokenPaid: 'InitiateCheckout', BookingCompleted: 'Purchase', Purchase: 'Purchase' };

app.post('/cron/capi', async (req, res) => {
  try {
    const sb = supabase(); if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
    const { data: queued } = await sb.from('capi_events').select('*, builder:builders(brand_colors)').eq('sent', false).order('created_at', { ascending: true }).limit(req.body?.batch_size ?? 50);
    let sent = 0, failed = 0;
    for (const evt of queued ?? []) {
      try {
        const pixelId = evt.builder?.brand_colors?.meta_pixel_id ?? process.env.META_PIXEL_ID;
        if (!pixelId) throw new Error('no pixel id');
        const ud = evt.user_data ?? {};
        await meta('POST', `/${pixelId}/events`, { data: [{
          event_name: META_EVENT[evt.event_name] ?? evt.event_name, event_time: Math.floor(new Date(evt.event_time).getTime() / 1000),
          event_id: evt.id, action_source: 'system_generated',
          user_data: { em: ud.email ? sha(ud.email) : undefined, ph: ud.phone ? sha(String(ud.phone).replace(/\D/g, '')) : undefined, country: ud.country ? sha(ud.country) : undefined },
          custom_data: { ...evt.custom_data, value: evt.event_value, currency: evt.currency },
        }] });
        await sb.from('capi_events').update({ sent: true, sent_at: new Date().toISOString() }).eq('id', evt.id);
        sent++;
      } catch (e) { await sb.from('capi_events').update({ error: e.message }).eq('id', evt.id); failed++; }
    }
    res.json({ ok: true, picked: queued?.length ?? 0, sent, failed });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

async function logRun(builder_id, project_id, action, output, status = 'success') {
  const sb = supabase(); if (!sb || !builder_id) return;
  try { await sb.from('agent_runs').insert({ builder_id, agent: 'ads-agent', action, project_id, input: {}, output, status }); } catch {}
}

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message ?? 'internal error' }));
app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-ads-agent', msg: 'listening', port: PORT })));
