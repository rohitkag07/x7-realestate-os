/**
 * x7-re-content-agent — Content Engine (Phase 3)
 * -----------------------------------------------------------------------------
 * Self-contained Cloud Run service, mirroring the Phase 2 sales-agent
 * conventions established in this repo:
 *   - single index.js
 *   - x-agent-secret header auth
 *   - GET  /health, GET /health/dependencies
 *   - bilingual (Hindi-primary) content
 *   - all external API calls go through the tool-gateway
 *
 * Responsibilities (Blueprint Section 1.4):
 *   POST /calendar/generate  — GPT-4o builds a 30-day calendar → draft rows
 *   POST /render             — render one content row (Remotion or Higgsfield)
 *   POST /score              — Higgsfield brain_activity virality score
 *   POST /approve            — draft/review → scheduled
 *   POST /publish-due        — cron: publish scheduled rows whose time has come
 *   POST /render-pending     — cron: render any draft rows
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const PORT          = Number(process.env.PORT) || 8083;
const AGENT_SECRET  = process.env.AGENT_SECRET || '';
const TOOL_GATEWAY  = (process.env.TOOL_GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, '');
const OPENAI_KEY    = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL  = process.env.OPENAI_MODEL_CONTENT || 'gpt-4o';

const app = express();
app.use(express.json({ limit: '4mb' }));

// ---------------------------------------------------------------------------
// Supabase (service role)
// ---------------------------------------------------------------------------
let _sb = null;
function supabase() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

// ---------------------------------------------------------------------------
// Auth — x-agent-secret (matches Phase 2 sales-agent convention)
// ---------------------------------------------------------------------------
function requireSecret(req, res, next) {
  if (!AGENT_SECRET) return next(); // dev mode
  const presented = req.header('x-agent-secret');
  if (presented !== AGENT_SECRET) {
    return res.status(401).json({ ok: false, error: 'invalid agent secret' });
  }
  next();
}

// ---------------------------------------------------------------------------
// tool-gateway helper
// ---------------------------------------------------------------------------
async function gateway(path, body, { timeout = 600_000 } = {}) {
  const res = await fetch(`${TOOL_GATEWAY}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET, 'x-agent-token': AGENT_SECRET } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const text = await res.text();
  const json = text ? safeJson(text) : {};
  if (!res.ok) throw new Error(`gateway ${path} ${res.status}: ${(json && json.error) ?? text}`);
  return json;
}
function safeJson(s) { try { return JSON.parse(s); } catch { return s; } }

async function logRun({ builder_id, action, project_id = null, input = {}, output = {}, status = 'success', duration_ms = null, error = null }) {
  const sb = supabase();
  if (!sb || !builder_id) return;
  try {
    await sb.from('agent_runs').insert({
      builder_id, agent: 'content-agent', action, project_id,
      input, output, status, duration_ms, error,
    });
  } catch (e) {
    console.error('[logRun]', e?.message ?? e);
  }
}

// ===========================================================================
// HEALTH
// ===========================================================================
const startedAt = Date.now();
app.get('/health', (_req, res) => {
  res.json({ service: 'x7-re-content-agent', status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) });
});

app.get('/health/dependencies', async (_req, res) => {
  const out = {
    service: 'x7-re-content-agent',
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    openai: Boolean(OPENAI_KEY),
    tool_gateway: TOOL_GATEWAY,
  };
  if (out.supabase) {
    try {
      const { error } = await supabase().from('content_calendar').select('id', { head: true, count: 'exact' }).limit(1);
      out.supabase_ping = error ? 'error' : 'ok';
      if (error) out.supabase_error = error.message;
    } catch (e) { out.supabase_ping = 'error'; out.supabase_error = e?.message; }
  }
  // tool-gateway ping
  try {
    const r = await fetch(`${TOOL_GATEWAY}/health`, { signal: AbortSignal.timeout(2500) });
    out.tool_gateway_ping = r.ok ? 'ok' : 'down';
  } catch { out.tool_gateway_ping = 'down'; }
  res.json(out);
});

app.use(requireSecret);

// ===========================================================================
// Composition map — keeps the agent aligned with the Remotion factory
// ===========================================================================
const COMPOSITIONS = {
  PropertyWalkthrough: ['16x9', '9x16'],
  PriceReveal:         ['9x16', '1x1'],
  LocationExplainer:   ['9x16'],
  ConstructionUpdate:  ['9x16'],
  TestimonialReel:     ['9x16'],
  BeforeAfter:         ['9x16'],
  InvestmentComparison:['1x1'],
  FestivalCreative:    ['1x1'],
  AdCreative:          ['9x16'],
};

const DEFAULT_PILLARS = [
  { pillar: 'location_advantage',  name: 'Location Advantage',  weekly_slots: 2 },
  { pillar: 'construction_update', name: 'Construction Update', weekly_slots: 1 },
  { pillar: 'educational',         name: 'Educational',         weekly_slots: 2 },
  { pillar: 'social_proof',        name: 'Social Proof',        weekly_slots: 1 },
  { pillar: 'lifestyle',           name: 'Lifestyle',           weekly_slots: 1 },
  { pillar: 'investment_logic',    name: 'Investment Logic',    weekly_slots: 1 },
  { pillar: 'engagement',          name: 'Engagement',          weekly_slots: 1 },
];

// ===========================================================================
// POST /calendar/generate
// ===========================================================================
app.post('/calendar/generate', async (req, res) => {
  const t0 = Date.now();
  const { builder_id, project_id, month } = req.body ?? {};
  if (!builder_id || !project_id) {
    return res.status(400).json({ ok: false, error: 'builder_id and project_id required' });
  }
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });

  try {
    const [{ data: builder }, { data: project }] = await Promise.all([
      sb.from('builders').select('*').eq('id', builder_id).single(),
      sb.from('projects').select('*').eq('id', project_id).single(),
    ]);
    if (!builder || !project) return res.status(404).json({ ok: false, error: 'builder or project not found' });

    const { data: pillarRows } = await sb.from('content_pillars').select('*').eq('builder_id', builder_id);
    const pillars = (pillarRows && pillarRows.length) ? pillarRows : DEFAULT_PILLARS;

    const entries = OPENAI_KEY
      ? await generateWithGpt({ builder, project, pillars, month })
      : fallbackCalendar({ project, pillars, month });

    const rows = entries.map((e) => toContentRow({ e, builder, project, month }));
    const { data: inserted, error } = await sb.from('content_calendar').insert(rows).select('id');
    if (error) throw error;

    await logRun({ builder_id, project_id, action: 'calendar.generate', input: { month }, output: { count: inserted?.length ?? 0 }, duration_ms: Date.now() - t0 });
    res.json({ ok: true, count: inserted?.length ?? 0, content_ids: (inserted ?? []).map((r) => r.id), source: OPENAI_KEY ? 'gpt-4o' : 'fallback' });
  } catch (e) {
    await logRun({ builder_id, project_id, action: 'calendar.generate', status: 'failure', error: e.message, duration_ms: Date.now() - t0 });
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function generateWithGpt({ builder, project, pillars, month }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_KEY });
  const prompt = buildCalendarPrompt({ builder, project, pillars, month });
  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a content strategist for a Tier-2 Indian real estate builder. Respond with valid JSON only. Hindi is primary, English secondary.' },
      { role: 'user', content: prompt },
    ],
  });
  const raw = resp.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.entries) && parsed.entries.length ? parsed.entries : fallbackCalendar({ project, pillars, month });
}

function buildCalendarPrompt({ builder, project, pillars, month }) {
  const pillarList = pillars.map((p) => `- ${p.pillar} (${p.name}): ${p.weekly_slots || 1}x/week`).join('\n');
  return `Generate a 30-day content calendar for the project below. Output JSON { "entries": [...] }.

PROJECT: ${project.name}, ${project.location}, ${project.city}
Prices: ₹${project.price_range_min}-₹${project.price_range_max} Lakh | Plots: ${project.total_plots} (${project.available_plots} available)
RERA: ${project.rera_number ?? 'in process'} | Builder: ${builder.company_name}

PILLARS:
${pillarList}

Each entry: { day_offset(0-29), pillar, content_type(post|reel|story|video|ad_creative|carousel), platform(instagram|facebook|youtube|whatsapp_status), caption_en, caption_hi, hashtags[], hook, composition_id(one of ${Object.keys(COMPOSITIONS).join('|')} or null), scheduled_time("HH:MM"), pillar_reason }.
Reels/videos map to a composition_id; static posts use composition_id=null. ~26-30 entries, Hindi-primary captions, peak IST times (7-9am/12-2pm/6-9pm). JSON only.`;
}

function fallbackCalendar({ project, pillars, month }) {
  // Deterministic 28-entry plan when no OpenAI key — keeps the pipeline testable.
  const comps = ['PropertyWalkthrough', 'PriceReveal', 'LocationExplainer', 'ConstructionUpdate', 'TestimonialReel', 'BeforeAfter', 'InvestmentComparison', 'AdCreative'];
  const platforms = ['instagram', 'facebook', 'youtube', 'whatsapp_status'];
  const types = ['post', 'reel', 'carousel', 'video', 'ad_creative', 'story'];
  const out = [];
  for (let i = 0; i < 28; i++) {
    const pillar = pillars[i % pillars.length];
    const isVideo = i % 3 === 0;
    out.push({
      day_offset: i,
      pillar: pillar.pillar,
      content_type: isVideo ? 'reel' : types[i % types.length],
      platform: platforms[i % platforms.length],
      caption_en: `${project.name} — ${pillar.name} update #${i + 1}`,
      caption_hi: `${project.name} — ${pillar.name} अपडेट #${i + 1}`,
      hashtags: [`${project.city.replace(/\s+/g, '')}RealEstate`, 'ReraApproved', 'PlotsForSale'],
      hook: `${project.name} mein ${pillar.name}`,
      composition_id: isVideo ? comps[i % comps.length] : null,
      scheduled_time: ['08:00', '13:00', '19:00'][i % 3],
      pillar_reason: `Balanced ${pillar.name} coverage`,
    });
  }
  return out;
}

function toContentRow({ e, builder, project, month }) {
  const start = startOfMonth(month);
  const d = new Date(start);
  d.setDate(d.getDate() + (Number(e.day_offset) || 0));
  const [hh, mm] = String(e.scheduled_time ?? '10:00').split(':');
  d.setHours(Number(hh) || 10, Number(mm) || 0, 0, 0);
  const isVideo = ['reel', 'video', 'long_form_video'].includes(e.content_type);
  return {
    builder_id: builder.id,
    project_id: project.id,
    content_type: normalizeType(e.content_type),
    platform: normalizePlatform(e.platform),
    pillar: e.pillar ?? null,
    caption: e.caption_en ?? null,
    caption_hindi: e.caption_hi ?? null,
    hashtags: e.hashtags ?? [],
    scheduled_for: d.toISOString(),
    status: 'draft',
    generated_by: 'gpt-4o',
    generation_prompt: e.hook ?? null,
    remotion_composition: e.composition_id ?? null,
    media_type: isVideo ? 'video' : 'image',
  };
}

function startOfMonth(monthStr) {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function normalizeType(t) {
  const map = { post: 'post', reel: 'reel', story: 'story', video: 'video', ad: 'ad_creative', ad_creative: 'ad_creative', carousel: 'carousel', long_form_video: 'long_form_video' };
  return map[t] ?? 'post';
}
function normalizePlatform(p) {
  const map = { instagram: 'instagram', facebook: 'facebook', youtube: 'youtube', google_ads: 'google_ads', linkedin: 'linkedin', twitter: 'twitter', whatsapp: 'whatsapp_status', whatsapp_status: 'whatsapp_status' };
  return map[p] ?? 'instagram';
}

// ===========================================================================
// POST /render
// ===========================================================================
app.post('/render', async (req, res) => {
  const { content_id } = req.body ?? {};
  if (!content_id) return res.status(400).json({ ok: false, error: 'content_id required' });
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });

  try {
    const { data: content, error } = await sb
      .from('content_calendar')
      .select('*, project:projects(*), builder:builders(*)')
      .eq('id', content_id).single();
    if (error || !content) return res.status(404).json({ ok: false, error: 'content not found' });

    await sb.from('content_calendar').update({ status: 'generating' }).eq('id', content_id);

    const jobBase = {
      builder_id: content.builder_id, project_id: content.project_id, content_id,
      status: 'running', started_at: new Date().toISOString(),
    };

    let result;
    if (content.remotion_composition) {
      const { data: job } = await sb.from('content_jobs').insert({ ...jobBase, job_type: 'remotion_render', provider: 'remotion', request: { composition: content.remotion_composition } }).select('*').single();
      try {
        const out = await gateway('/remotion/render', { composition: `${content.remotion_composition}-9x16`, props: buildProps(content), output_name: content.id });
        const mediaUrl = out.output_url ?? out.output_path ?? null;
        await sb.from('content_calendar').update({ status: 'review', media_url: mediaUrl }).eq('id', content_id);
        await sb.from('content_jobs').update({ status: 'succeeded', output_url: mediaUrl, response: out, completed_at: new Date().toISOString() }).eq('id', job.id);
        result = { provider: 'remotion', media_url: mediaUrl };
      } catch (e) {
        await sb.from('content_calendar').update({ status: 'failed' }).eq('id', content_id);
        await sb.from('content_jobs').update({ status: 'failed', error: e.message, completed_at: new Date().toISOString() }).eq('id', job.id);
        throw e;
      }
    } else {
      const isVideo = ['reel', 'video', 'long_form_video'].includes(content.content_type);
      const jobType = isVideo ? 'higgsfield_video' : (content.content_type === 'ad_creative' ? 'higgsfield_ad_pack' : 'higgsfield_image');
      const { data: job } = await sb.from('content_jobs').insert({ ...jobBase, job_type: jobType, provider: 'higgsfield', request: { content_type: content.content_type } }).select('*').single();
      try {
        const prompt = content.generation_prompt ?? content.caption ?? content.caption_hindi ?? 'Real estate marketing creative';
        const out = jobType === 'higgsfield_video'
          ? await gateway('/higgsfield/video', { prompt, mode: 'product_showcase', aspectRatio: '9:16', durationSec: 15 })
          : jobType === 'higgsfield_ad_pack'
            ? await gateway('/higgsfield/ad-pack', { prompt, variants: 4, aspectRatio: '1:1' })
            : await gateway('/higgsfield/image', { prompt, aspectRatio: '1:1' });
        const mediaUrl = out?.url ?? out?.output_url ?? out?.results?.[0]?.url ?? null;
        await sb.from('content_calendar').update({ status: 'review', media_url: mediaUrl, thumbnail_url: mediaUrl, higgsfield_job_id: out?.id ?? null }).eq('id', content_id);
        await sb.from('content_jobs').update({ status: 'succeeded', output_url: mediaUrl, response: out, external_job_id: out?.id ?? null, completed_at: new Date().toISOString() }).eq('id', job.id);
        result = { provider: 'higgsfield', media_url: mediaUrl };
      } catch (e) {
        await sb.from('content_calendar').update({ status: 'failed' }).eq('id', content_id);
        await sb.from('content_jobs').update({ status: 'failed', error: e.message, completed_at: new Date().toISOString() }).eq('id', job.id);
        throw e;
      }
    }
    await logRun({ builder_id: content.builder_id, project_id: content.project_id, action: 'render', output: result });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function buildProps(content) {
  const p = content.project, b = content.builder;
  return {
    projectName: p.name, location: p.location, city: p.city,
    builderName: b.company_name,
    brandPrimary: b.brand_colors?.primary ?? '#0F172A',
    brandAccent:  b.brand_colors?.accent  ?? '#F59E0B',
    reraNumber: p.rera_number, startingPrice: p.price_range_min,
    amenities: p.amenities ?? [], whatsappNumber: b.whatsapp_number,
    landmarks: (p.nearby_landmarks ?? []).map((l) => ({ name: l.name, type: l.type ?? 'other', distanceKm: Number(l.distance_km) })),
    cityName: p.city,
    startPrice: Math.round((p.price_range_min ?? 18) * 1.5),
    endPrice: p.price_range_min ?? 18,
    hook: content.generation_prompt ?? `Plots from ₹${p.price_range_min} Lakh`,
    hookHi: content.caption_hindi,
    offer: `RERA approved · Last ${p.available_plots} plots`,
  };
}

// ===========================================================================
// POST /score  (Higgsfield brain_activity)
// ===========================================================================
app.post('/score', async (req, res) => {
  const { content_id } = req.body ?? {};
  if (!content_id) return res.status(400).json({ ok: false, error: 'content_id required' });
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });

  try {
    const { data: content } = await sb.from('content_calendar').select('*').eq('id', content_id).single();
    if (!content?.media_url) return res.status(400).json({ ok: false, error: 'content has no media_url to score' });

    const result = await gateway('/higgsfield/score', { videoUrl: content.media_url });
    const decision = result.score >= 60 ? 'approved' : result.score >= 40 ? 'review' : 'failed';
    await sb.from('content_calendar').update({ virality_score: result.score, status: decision }).eq('id', content_id);
    await logRun({ builder_id: content.builder_id, project_id: content.project_id, action: 'score', output: { score: result.score, decision } });
    res.json({ ok: true, score: result.score, decision, detail: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===========================================================================
// POST /approve
// ===========================================================================
app.post('/approve', async (req, res) => {
  const { content_id, scheduled_for } = req.body ?? {};
  if (!content_id) return res.status(400).json({ ok: false, error: 'content_id required' });
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
  const patch = { status: 'scheduled' };
  if (scheduled_for) patch.scheduled_for = scheduled_for;
  const { data, error } = await sb.from('content_calendar').update(patch).eq('id', content_id).select('*').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, content: data });
});

// ===========================================================================
// POST /publish-due  (cron)
// ===========================================================================
app.post('/publish-due', async (req, res) => {
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
  const { data: due } = await sb.from('content_calendar')
    .select('*, builder:builders(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .limit(req.body?.batch_size ?? 10);

  let published = 0, failed = 0;
  for (const c of due ?? []) {
    try {
      if (!c.media_url) throw new Error('no media_url');
      const caption = [c.caption_hindi, c.caption, (c.hashtags ?? []).map((t) => `#${t}`).join(' ')].filter(Boolean).join('\n\n');
      const isVideo = ['reel', 'video', 'long_form_video'].includes(c.content_type);
      let ext;
      if (c.platform === 'facebook') {
        ext = await gateway('/meta/facebook', { pageId: c.builder?.brand_colors?.fb_page_id ?? process.env.META_FB_PAGE_ID, mediaUrl: c.media_url, caption, mediaType: isVideo ? 'video' : 'photo' });
      } else {
        ext = await gateway('/meta/instagram', { igUserId: c.builder?.brand_colors?.ig_user_id ?? process.env.META_IG_USER_ID, mediaUrl: c.media_url, caption, mediaType: isVideo ? 'VIDEO' : 'IMAGE' });
      }
      await sb.from('content_calendar').update({ status: 'published', published_at: new Date().toISOString(), external_post_id: ext.ig_post_id ?? ext.fb_post_id ?? null }).eq('id', c.id);
      published++;
    } catch (e) {
      await sb.from('content_calendar').update({ status: 'failed' }).eq('id', c.id);
      failed++;
    }
  }
  res.json({ ok: true, picked: due?.length ?? 0, published, failed });
});

// ===========================================================================
// POST /render-pending  (cron — drains drafts)
// ===========================================================================
app.post('/render-pending', async (req, res) => {
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase not configured' });
  const { data: drafts } = await sb.from('content_calendar').select('id').eq('status', 'draft').limit(req.body?.batch_size ?? 5);
  const results = [];
  for (const d of drafts ?? []) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET } : {}) },
        body: JSON.stringify({ content_id: d.id }),
      });
      results.push({ id: d.id, ok: r.ok });
    } catch (e) {
      results.push({ id: d.id, ok: false, error: e.message });
    }
  }
  res.json({ ok: true, processed: results.length, results });
});

app.use((err, _req, res, _next) => {
  console.error('[content-agent] unhandled', err?.message);
  res.status(500).json({ ok: false, error: err?.message ?? 'internal error' });
});

app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-content-agent', msg: 'listening', port: PORT })));
