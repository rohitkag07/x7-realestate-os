/**
 * x7-re-finance-agent — Payment tracking, receipts, reports (Phase 5)
 * Self-contained Cloud Run service (Codex-aligned).
 *   POST /razorpay/webhook       — Razorpay signed → invoice paid (no agent-secret)
 *   POST /payment/manual         — manual mark-paid (cash/cheque/NEFT)
 *   POST /report/monthly         — generate + ship monthly summary PDFs
 *   POST /report/revenue         — builder revenue rollup (JSON)
 *   POST /cron/monthly-summary   — monthly summary push
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT) || 8088;
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const TOOL_GATEWAY = (process.env.TOOL_GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, '');
const COLONY_AGENT = (process.env.COLONY_AGENT_URL || 'http://localhost:8087').replace(/\/$/, '');

const app = express();
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

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
async function gw(base, path, body) {
  const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET, 'x-agent-token': AGENT_SECRET } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error ?? `${path} ${r.status}`);
  return j;
}

const startedAt = Date.now();
app.get('/health', (_req, res) => res.json({ service: 'x7-re-finance-agent', status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) }));
app.get('/health/dependencies', (_req, res) => res.json({ service: 'x7-re-finance-agent', supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), razorpay: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET), colony_agent: COLONY_AGENT }));

// ---- Razorpay webhook (NOT agent-secret gated — uses its own signature) ----
function verifyRazorpay(rawBody, sig) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !sig) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try { return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex')); } catch { return false; }
}
async function recordIncoming({ invoice_id, amount, mode, reference }) {
  const sb = supabase(); if (!invoice_id) throw new Error('invoice_id required');
  const { data: existing } = await sb.from('payment_receipts').select('id').eq('payment_reference', reference).maybeSingle();
  if (existing) return { ok: true, duplicate: true, receipt_id: existing.id };
  return await gw(COLONY_AGENT, '/billing/confirm-payment', { invoice_id, mode, reference, amount });
}
app.post('/razorpay/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    if (!verifyRazorpay(req.rawBody, req.header('x-razorpay-signature')) && process.env.NODE_ENV === 'production') return;
    const payload = req.body; const event = payload?.event;
    if (!event?.includes('paid') && !event?.includes('captured')) return;
    const pmt = payload?.payload?.payment?.entity ?? payload?.payload?.payment_link?.entity;
    if (!pmt) return;
    const notes = pmt.notes ?? {};
    await recordIncoming({ invoice_id: notes.invoice_id ?? null, amount: Number(pmt.amount ?? 0) / 100, mode: (pmt.method ?? 'upi').toLowerCase(), reference: pmt.id ?? pmt.payment_id ?? null });
  } catch (e) { console.error('[finance] razorpay webhook', e.message); }
});

app.use(requireSecret);

app.post('/payment/manual', async (req, res) => {
  try {
    const { invoice_id, amount, mode = 'cash', reference } = req.body ?? {};
    if (!invoice_id) return res.status(400).json({ ok: false, error: 'invoice_id required' });
    res.json(await recordIncoming({ invoice_id, amount, mode, reference: reference ?? `MANUAL-${Date.now()}` }));
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

function lastMonth() { const d = new Date(); d.setDate(0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
async function sendMonthly({ month, projectId }) {
  const sb = supabase(); const target = month ?? lastMonth();
  let q = sb.from('v_monthly_collection').select('*').eq('month', target); if (projectId) q = q.eq('project_id', projectId);
  const { data: summaries } = await q;
  let sent = 0, failed = 0;
  for (const s of summaries ?? []) {
    try {
      const { data: project } = await sb.from('projects').select('*, builders(*)').eq('id', s.project_id).single();
      const r = await gw(TOOL_GATEWAY, '/pdf/monthly-report', { project_id: project.id, month: target });
      if (project.builders?.phone) await gw(TOOL_GATEWAY, '/whatsapp/send/document', { to: project.builders.phone.replace(/^\+/, ''), url: r.pdf_url, filename: `monthly-${target}.pdf`, caption: `📊 ${project.name} — ${target}\nCollection: ${s.collection_rate_pct}%\nBilled ₹${s.billed} · Collected ₹${s.collected} · Pending ₹${s.pending}`, builder_id: project.builder_id });
      sent++;
    } catch { failed++; }
  }
  return { ok: true, month: target, sent, failed };
}
app.post('/report/monthly', async (req, res) => { try { res.json(await sendMonthly(req.body ?? {})); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/cron/monthly-summary', async (req, res) => { try { res.json(await sendMonthly({ month: req.body?.month })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

app.post('/report/revenue', async (req, res) => {
  try {
    const sb = supabase(); const { builder_id, from, to } = req.body ?? {};
    if (!builder_id) return res.status(400).json({ ok: false, error: 'builder_id required' });
    const start = from ?? new Date(Date.now() - 30 * 864e5).toISOString(), end = to ?? new Date().toISOString();
    const { data: projs } = await sb.from('projects').select('id').eq('builder_id', builder_id);
    const projectIds = (projs ?? []).map((p) => p.id);
    const [{ data: bookings }, { data: invoices }] = await Promise.all([
      sb.from('bookings').select('token_amount, total_amount, status, project_id').gte('booking_date', start).lte('booking_date', end).in('project_id', projectIds.length ? projectIds : ['00000000-0000-0000-0000-000000000000']),
      sb.from('maintenance_invoices').select('amount, late_fee, project_id').eq('status', 'paid').gte('paid_date', start.slice(0, 10)).lte('paid_date', end.slice(0, 10)).in('project_id', projectIds.length ? projectIds : ['00000000-0000-0000-0000-000000000000']),
    ]);
    const tokenRev = (bookings ?? []).reduce((s, b) => s + (b.token_amount ?? 0), 0);
    const fullRev = (bookings ?? []).filter((b) => b.status === 'completed').reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const maintRev = (invoices ?? []).reduce((s, i) => s + (i.amount ?? 0) + (i.late_fee ?? 0), 0);
    res.json({ ok: true, period: { from: start, to: end }, bookings: { count: bookings?.length ?? 0, token_revenue: tokenRev, full_revenue: fullRev }, maintenance: { count: invoices?.length ?? 0, revenue: maintRev }, total: tokenRev + fullRev + maintRev });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message ?? 'internal error' }));
app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-finance-agent', msg: 'listening', port: PORT })));
