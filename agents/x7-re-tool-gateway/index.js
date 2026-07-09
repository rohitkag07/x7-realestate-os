/**
 * x7-re-tool-gateway — Centralized external-API executor (Codex-aligned)
 * -----------------------------------------------------------------------------
 * Single index.js, x-agent-secret auth, GET /health + /health/dependencies.
 * Provides shared outbound integrations so agents never call Meta /
 * Higgsfield / Remotion / Razorpay directly:
 *
 *   /whatsapp/send/{text,document,image,buttons}
 *   /upi/link
 *   /higgsfield/{image,video,ad-pack,restyle,score}
 *   /remotion/render
 *   /meta/{instagram,facebook}
 *
 * External calls degrade gracefully when credentials are absent so the
 * pipeline stays testable in dev.
 */
import express from 'express';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const PORT         = Number(process.env.PORT) || 8081;
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const WHATSAPP_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v17.0';
const META_BASE    = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}`;

const app = express();
app.use(express.json({ limit: '8mb' }));

let _supabase = null;
function supabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _supabase;
}

function log(level, event, extra = {}) {
  console.log(JSON.stringify({
    level,
    event,
    service: 'x7-re-tool-gateway',
    time: new Date().toISOString(),
    ...extra,
  }));
}

function requireSecret(req, res, next) {
  if (!AGENT_SECRET) return next();
  if (req.header('x-agent-secret') !== AGENT_SECRET && req.header('x-agent-token') !== AGENT_SECRET) {
    return res.status(401).json({ ok: false, error: 'invalid agent secret' });
  }
  next();
}
const safe = (res, fn) => Promise.resolve().then(fn).then((r) => res.json(r)).catch((e) => {
  log('error', 'request_failed', { error: e.message });
  res.status(500).json({ ok: false, error: e.message });
});

// ---------------------------------------------------------------------------
// HEALTH
// ---------------------------------------------------------------------------
const startedAt = Date.now();
app.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'x7-re-tool-gateway',
  status: 'ok',
  supabase: Boolean(supabase()),
  whatsapp: {
    configured: Boolean((process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID) && (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN)),
    graph_version: WHATSAPP_GRAPH_VERSION,
  },
  uptime_s: Math.round((Date.now() - startedAt) / 1000),
}));
app.get('/health/dependencies', (_req, res) => res.json({
  service: 'x7-re-tool-gateway',
  whatsapp: Boolean((process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID) && (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN)),
  meta:     Boolean(process.env.META_ACCESS_TOKEN),
  remotion: process.env.REMOTION_MODE ?? 'local',
  higgsfield: Boolean(process.env.HIGGSFIELD_API_KEY),
}));

app.use(requireSecret);

// ---------------------------------------------------------------------------
// WHATSAPP
// ---------------------------------------------------------------------------
async function incrementBusinessUsage(businessId, field, amount = 1) {
  const sb = supabase();
  if (!sb || !businessId || !['messages_in', 'messages_out', 'handoffs', 'qual_answers'].includes(field)) return;

  const today = new Date().toISOString().split('T')[0];
  try {
    await sb.from('business_usage').upsert({
      business_id: businessId,
      date: today,
    }, { onConflict: 'business_id,date' });

    const { data, error } = await sb
      .from('business_usage')
      .select(field)
      .eq('business_id', businessId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    const current = Number(data?.[field] ?? 0);
    const update = {};
    update[field] = current + amount;

    const { error: updateError } = await sb
      .from('business_usage')
      .update(update)
      .eq('business_id', businessId)
      .eq('date', today);

    if (updateError) throw updateError;
    log('info', 'usage_incremented', { businessId, field, amount });
  } catch (error) {
    log('warn', 'usage_increment_failed', { businessId, field, error: error.message });
  }
}

function logMetaError(response, payload, context = {}) {
  if (response.status === 401 || payload?.error?.type === 'OAuthException') {
    log('error', 'whatsapp_token_error', {
      status: response.status,
      code: payload?.error?.code ?? null,
      type: payload?.error?.type ?? null,
      message: payload?.error?.message ?? response.statusText,
      ...context,
    });
    return;
  }

  log('warn', 'whatsapp_send_failed', {
    status: response.status,
    code: payload?.error?.code ?? null,
    type: payload?.error?.type ?? null,
    message: payload?.error?.message ?? response.statusText,
    ...context,
  });
}

async function metaSend(payload, context = {}) {
  const pid = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
  if (!pid || !token) throw new Error('WhatsApp credentials missing');
  const res = await fetch(`${META_BASE}/${pid}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logMetaError(res, json, context);
    throw new Error(`WhatsApp send failed: ${json?.error?.message ?? res.statusText}`);
  }
  await incrementBusinessUsage(context.businessId, 'messages_out');
  log('info', 'whatsapp_send_succeeded', { to: payload?.to ? `***${String(payload.to).slice(-4)}` : null, type: payload?.type, businessId: context.businessId ?? null });
  return { ok: true, wa_message_id: json?.messages?.[0]?.id ?? null, status: 'sent' };
}
function usageContext(req) {
  return { businessId: req.body.business_id || req.body.businessId || req.body.builder_id || req.body.builderId || null };
}

app.post('/whatsapp/send', (req, res) => safe(res, () => {
  const type = req.body.type || 'text';
  if (type !== 'text') throw new Error('Use /whatsapp/send/document, /image, or /buttons for non-text messages');
  return metaSend({ messaging_product: 'whatsapp', to: req.body.to, type: 'text', text: { body: req.body.body || req.body.text, preview_url: req.body.preview_url ?? true } }, usageContext(req));
}));
app.post('/whatsapp/send/text',     (req, res) => safe(res, () => metaSend({ messaging_product: 'whatsapp', to: req.body.to, type: 'text', text: { body: req.body.body, preview_url: true } }, usageContext(req))));
app.post('/whatsapp/send/document', (req, res) => safe(res, () => metaSend({ messaging_product: 'whatsapp', to: req.body.to, type: 'document', document: { link: req.body.url, filename: req.body.filename, caption: req.body.caption } }, usageContext(req))));
app.post('/whatsapp/send/image',    (req, res) => safe(res, () => metaSend({ messaging_product: 'whatsapp', to: req.body.to, type: 'image', image: { link: req.body.url, caption: req.body.caption } }, usageContext(req))));
app.post('/whatsapp/send/buttons',  (req, res) => safe(res, () => metaSend({ messaging_product: 'whatsapp', to: req.body.to, type: 'interactive', interactive: { type: 'button', body: { text: req.body.body }, action: { buttons: (req.body.buttons ?? []).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) } } }, usageContext(req))));

// ---------------------------------------------------------------------------
// UPI
// ---------------------------------------------------------------------------
app.post('/upi/link', (req, res) => safe(res, () => {
  const { vpa, name, amount, note, transactionRef, projectName } = req.body ?? {};
  const finalVpa = vpa ?? process.env.DEFAULT_UPI_VPA, finalName = name ?? process.env.DEFAULT_UPI_NAME;
  if (!finalVpa) throw new Error('UPI VPA required');
  if (amount == null || amount < 1) throw new Error('amount must be >= 1');
  const params = new URLSearchParams({ pa: finalVpa, pn: finalName ?? 'Builder', am: String(Number(amount).toFixed(2)), cu: 'INR', tn: (note ?? 'Payment').slice(0, 80) });
  if (transactionRef) params.set('tr', transactionRef);
  const link = `upi://pay?${params.toString()}`;
  return { ok: true, link, snippet: `💰 ${projectName ? projectName + ' — ' : ''}Payment\nAmount: ₹${Number(amount).toLocaleString('en-IN')}\nTap to pay: ${link}` };
}));

// ---------------------------------------------------------------------------
// HIGGSFIELD (CLI wrapper)
// ---------------------------------------------------------------------------
function higgsfield(args, { timeout = 600_000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('higgsfield', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    const to = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('higgsfield timeout')); }, timeout);
    proc.on('error', (e) => { clearTimeout(to); reject(new Error(`higgsfield not available: ${e.message}`)); });
    proc.on('close', (code) => { clearTimeout(to); if (code !== 0) return reject(new Error(`higgsfield exit ${code}: ${err.trim()}`)); try { resolve(JSON.parse(out)); } catch { resolve({ raw: out }); } });
  });
}
app.post('/higgsfield/image',   (req, res) => safe(res, () => higgsfield(['generate', 'create', 'gpt_image_2', '--prompt', req.body.prompt ?? '', '--aspect_ratio', req.body.aspectRatio ?? '1:1', '--wait', '--output', 'json'])));
app.post('/higgsfield/video',   (req, res) => safe(res, () => higgsfield(['generate', 'create', 'marketing_studio_video', '--prompt', req.body.prompt ?? '', '--mode', req.body.mode ?? 'product_showcase', '--duration', String(req.body.durationSec ?? 15), '--aspect_ratio', req.body.aspectRatio ?? '9:16', '--wait', '--output', 'json'], { timeout: 900_000 })));
app.post('/higgsfield/ad-pack', (req, res) => safe(res, () => higgsfield(['generate', 'create', 'marketing_studio_image', '--prompt', req.body.prompt ?? '', '--variants', String(req.body.variants ?? 4), '--aspect_ratio', req.body.aspectRatio ?? '1:1', '--wait', '--output', 'json'])));
app.post('/higgsfield/restyle', (req, res) => safe(res, () => higgsfield(['generate', 'create', 'restyle', '--source', req.body.sourceUrl ?? '', '--theme', req.body.themePreset ?? '', '--wait', '--output', 'json'])));
app.post('/higgsfield/score',   (req, res) => safe(res, async () => {
  const r = await higgsfield(['generate', 'create', 'brain_activity', '--video', req.body.videoUrl ?? '', '--wait', '--output', 'json']);
  return { ok: true, score: Number(r?.score ?? 0), hook_strength: Number(r?.hook_strength ?? 0), attention_retention: Number(r?.attention_retention ?? 0), distraction_risk: Number(r?.distraction_risk ?? 0), raw: r };
}));

// ---------------------------------------------------------------------------
// REMOTION render (lambda or local)
// ---------------------------------------------------------------------------
app.post('/remotion/render', (req, res) => safe(res, async () => {
  const { composition, props, output_name } = req.body ?? {};
  if (!composition) throw new Error('composition required');
  const mode = process.env.REMOTION_MODE ?? 'local';
  if (mode === 'lambda') {
    let renderMediaOnLambda;
    try { ({ renderMediaOnLambda } = await import('@remotion/lambda/client')); }
    catch { throw new Error('@remotion/lambda not installed'); }
    const result = await renderMediaOnLambda({
      region: process.env.REMOTION_LAMBDA_REGION ?? 'us-east-1',
      functionName: process.env.REMOTION_LAMBDA_FN,
      serveUrl: process.env.REMOTION_SERVE_URL,
      composition, codec: 'h264', inputProps: props ?? {}, privacy: 'public', outName: `${output_name}.mp4`,
    });
    return { ok: true, render_id: result.renderId, output_url: result.outUrl ?? null, bucket: result.bucketName };
  }
  // local mode — spawn remotion CLI
  return await new Promise((resolve, reject) => {
    const outPath = `/tmp/${output_name ?? 'render'}.mp4`;
    const proc = spawn('npx', ['remotion', 'render', 'src/index.ts', composition, outPath, '--props', JSON.stringify(props ?? {}), '--codec', 'h264', '--log', 'error'], { cwd: process.env.REMOTION_PROJECT_DIR ?? './remotion', stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', (e) => reject(new Error(`remotion not available: ${e.message}`)));
    proc.on('close', (code) => code === 0 ? resolve({ ok: true, output_path: outPath }) : reject(new Error(`remotion exit ${code}: ${err.trim()}`)));
  });
}));

// ---------------------------------------------------------------------------
// META publish (Instagram + Facebook)
// ---------------------------------------------------------------------------
async function metaGraph(path, body) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not set');
  const params = new URLSearchParams({ access_token: token, ...Object.fromEntries(Object.entries(body ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])) });
  const res = await fetch(`${META_BASE}${path}?${params}`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `meta ${path}`);
  return json;
}
app.post('/meta/instagram', (req, res) => safe(res, async () => {
  const { igUserId, mediaUrl, caption, mediaType = 'IMAGE' } = req.body ?? {};
  if (!igUserId) throw new Error('igUserId required');
  const body = mediaType === 'VIDEO' ? { video_url: mediaUrl, caption, media_type: 'REELS' } : { image_url: mediaUrl, caption };
  const { id: creation_id } = await metaGraph(`/${igUserId}/media`, body);
  const { id: ig_post_id } = await metaGraph(`/${igUserId}/media_publish`, { creation_id });
  return { ok: true, ig_post_id, creation_id };
}));
app.post('/meta/facebook', (req, res) => safe(res, async () => {
  const { pageId, mediaUrl, caption, mediaType = 'photo' } = req.body ?? {};
  if (!pageId) throw new Error('pageId required');
  const endpoint = mediaType === 'video' ? 'videos' : 'photos';
  const body = mediaType === 'video' ? { file_url: mediaUrl, description: caption } : { url: mediaUrl, caption };
  const { id, post_id } = await metaGraph(`/${pageId}/${endpoint}`, body);
  return { ok: true, fb_post_id: post_id ?? id };
}));


function pdfRoute(path, handler) {
  app.post(path, (req, res) => safe(res, () => handler(req.body ?? {})));
}

// ---------------------------------------------------------------------------
// FINANCE PDFs (Phase 5) — invoice / receipt / gst-invoice / monthly-report
// ---------------------------------------------------------------------------
let _sbTG = null;
function sbTG() {
  if (_sbTG) return _sbTG;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE creds missing for PDF storage');
  _sbTG = createClient(url, key, { auth: { persistSession: false } });
  return _sbTG;
}
function pdfBuffer(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { draw(doc); doc.end(); } catch (e) { reject(e); }
  });
}
function band(doc, builder, project, accent = '#F59E0B', primary = '#0F172A') {
  doc.rect(0, 0, doc.page.width, 80).fill(primary);
  doc.fillColor(accent).fontSize(18).text(builder?.company_name ?? 'X7 RealEstate', 48, 26);
  doc.fillColor('#ffffff').fontSize(10).text(project?.name ?? '', 48, 50);
  doc.fillColor('#0F172A'); doc.moveDown(4);
}
function row(doc, label, value, color) {
  const y = doc.y;
  doc.fontSize(11).fillColor('#64748b').text(label, 48, y);
  doc.fontSize(11).fillColor(color ?? '#0F172A').text(String(value ?? '—'), 280, y);
  doc.moveDown(0.6);
}
async function uploadPdf(bucket, filename, buffer, signed) {
  const sb = sbTG();
  await sb.storage.from(bucket).upload(filename, buffer, { contentType: 'application/pdf', upsert: true });
  if (signed) { const { data } = await sb.storage.from(bucket).createSignedUrl(filename, 60 * 60 * 24 * 365); return data?.signedUrl ?? null; }
  const { data } = sb.storage.from(bucket).getPublicUrl(filename); return data?.publicUrl ?? null;
}

pdfRoute('/pdf/invoice', async (body) => {
  const sb = sbTG();
  const { data: inv } = await sb.from('maintenance_invoices').select('*, resident:residents(*), project:projects(*, builders(*))').eq('id', body.invoice_id).single();
  if (!inv) throw new Error('invoice not found');
  const { data: settings } = await sb.from('colony_settings').select('*').eq('project_id', inv.project.id).maybeSingle();
  const b = inv.project.builders, accent = b?.brand_colors?.accent ?? '#F59E0B', primary = b?.brand_colors?.primary ?? '#0F172A';
  const buffer = await pdfBuffer((doc) => {
    band(doc, b, inv.project, accent, primary);
    doc.fontSize(22).fillColor(primary).text('MAINTENANCE INVOICE', 48, 110);
    doc.fontSize(11).fillColor('#64748b').text(`For: ${inv.month}`); doc.text(`Issued: ${new Date(inv.created_at).toLocaleDateString('en-IN')}`); doc.moveDown();
    doc.fontSize(12).fillColor(primary).text('Resident'); doc.fontSize(11).fillColor('#0F172A').text(inv.resident?.name ?? '—'); doc.text(inv.resident?.phone ?? ''); doc.moveDown();
    const y = doc.y; doc.rect(48, y, doc.page.width - 96, 80).fillAndStroke('#fff7e6', accent);
    doc.fillColor(primary).fontSize(11).text('Amount Due', 64, y + 14); doc.fontSize(34).fillColor(accent).text(`₹${inv.amount.toLocaleString('en-IN')}`, 64, y + 32);
    doc.fillColor('#0F172A'); doc.y = y + 96; doc.moveDown();
    row(doc, 'Due Date', new Date(inv.due_date).toLocaleDateString('en-IN'), '#dc2626');
    row(doc, 'UPI VPA', settings?.upi_vpa ?? '—'); row(doc, 'Bank A/c', settings?.bank_account_no ?? '—'); row(doc, 'IFSC', settings?.bank_ifsc ?? '—');
    if (body.upi_link) row(doc, 'UPI Link', body.upi_link);
  });
  const url = await uploadPdf('private-assets', `invoices/${inv.project.id}/${inv.id}.pdf`, buffer, true);
  await sb.from('maintenance_invoices').update({ invoice_pdf_url: url }).eq('id', inv.id);
  return { ok: true, pdf_url: url };
});

pdfRoute('/pdf/receipt', async (body) => {
  const sb = sbTG();
  const { data: rec } = await sb.from('payment_receipts').select('*, invoice:maintenance_invoices(*), resident:residents(*), project:projects(*, builders(*))').eq('id', body.receipt_id).single();
  if (!rec) throw new Error('receipt not found');
  const b = rec.project.builders, accent = b?.brand_colors?.accent ?? '#F59E0B', primary = b?.brand_colors?.primary ?? '#0F172A';
  const buffer = await pdfBuffer((doc) => {
    band(doc, b, rec.project, accent, primary);
    doc.fontSize(22).fillColor('#16a34a').text('PAYMENT RECEIPT', 48, 110);
    doc.fontSize(11).fillColor('#64748b').text(`Receipt No: ${rec.receipt_number}`); doc.text(`Issued: ${new Date(rec.issued_at).toLocaleString('en-IN')}`); doc.moveDown();
    doc.fontSize(12).fillColor(primary).text('Paid By'); doc.fontSize(11).fillColor('#0F172A').text(rec.resident?.name ?? '—'); doc.moveDown();
    row(doc, 'Amount', `₹${rec.amount.toLocaleString('en-IN')}`, '#16a34a'); row(doc, 'Mode', String(rec.payment_mode ?? '').toUpperCase());
    row(doc, 'Reference', rec.payment_reference ?? '—'); row(doc, 'For Month', rec.invoice?.month ?? '—');
  });
  const url = await uploadPdf('private-assets', `receipts/${rec.project.id}/${rec.receipt_number}.pdf`, buffer, true);
  await sb.from('payment_receipts').update({ pdf_url: url }).eq('id', rec.id);
  return { ok: true, pdf_url: url };
});

pdfRoute('/pdf/gst-invoice', async (body) => {
  const sb = sbTG();
  const { data: inv } = await sb.from('maintenance_invoices').select('*, resident:residents(*), project:projects(*, builders(*))').eq('id', body.invoice_id).single();
  if (!inv) throw new Error('invoice not found');
  const { data: settings } = await sb.from('colony_settings').select('*').eq('project_id', inv.project.id).maybeSingle();
  const b = inv.project.builders, primary = b?.brand_colors?.primary ?? '#0F172A';
  const gstRate = Number(settings?.gst_rate ?? 18), taxable = inv.amount, cgst = taxable * gstRate / 200, sgst = taxable * gstRate / 200;
  const buffer = await pdfBuffer((doc) => {
    band(doc, b, inv.project, b?.brand_colors?.accent ?? '#F59E0B', primary);
    doc.fontSize(20).fillColor(primary).text('TAX INVOICE', 48, 110); doc.moveDown();
    row(doc, 'GSTIN', settings?.gst_number ?? '—'); row(doc, 'PAN', settings?.pan_number ?? '—'); row(doc, 'HSN/SAC', '997212'); doc.moveDown();
    doc.fontSize(12).fillColor(primary).text('Bill To'); doc.fontSize(11).text(inv.resident?.name ?? '—'); doc.moveDown();
    row(doc, 'Taxable Value', `₹${taxable.toLocaleString('en-IN')}`); row(doc, `CGST @ ${gstRate / 2}%`, `₹${cgst.toFixed(2)}`); row(doc, `SGST @ ${gstRate / 2}%`, `₹${sgst.toFixed(2)}`);
    row(doc, 'TOTAL', `₹${(taxable + cgst + sgst + (inv.late_fee ?? 0)).toFixed(2)}`, '#16a34a');
  });
  const url = await uploadPdf('private-assets', `gst-invoices/${inv.project.id}/${inv.id}.pdf`, buffer, true);
  return { ok: true, pdf_url: url };
});

pdfRoute('/pdf/monthly-report', async (body) => {
  const sb = sbTG();
  const { data: project } = await sb.from('projects').select('*, builders(*)').eq('id', body.project_id).single();
  const { data: summary } = await sb.from('v_monthly_collection').select('*').eq('project_id', body.project_id).eq('month', body.month).maybeSingle();
  const b = project.builders, primary = b?.brand_colors?.primary ?? '#0F172A';
  const s = summary ?? {};
  const buffer = await pdfBuffer((doc) => {
    band(doc, b, project, b?.brand_colors?.accent ?? '#F59E0B', primary);
    doc.fontSize(22).fillColor(primary).text(`Monthly Report — ${body.month}`, 48, 110); doc.moveDown();
    doc.fontSize(14).text('Maintenance Collection'); doc.moveDown(0.3);
    row(doc, 'Total Billed', `₹${(s.billed ?? 0).toLocaleString('en-IN')}`); row(doc, 'Collected', `₹${(s.collected ?? 0).toLocaleString('en-IN')}`, '#16a34a');
    row(doc, 'Outstanding', `₹${(s.pending ?? 0).toLocaleString('en-IN')}`, '#dc2626'); row(doc, 'Collection Rate', `${s.collection_rate_pct ?? 0}%`);
  });
  const url = await uploadPdf('private-assets', `reports/${body.project_id}/monthly-${body.month}.pdf`, buffer, true);
  return { ok: true, pdf_url: url };
});

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message ?? 'internal error' }));
app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-tool-gateway', msg: 'listening', port: PORT })));
