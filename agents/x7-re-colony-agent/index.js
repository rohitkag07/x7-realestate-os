/**
 * x7-re-colony-agent — Colony Management Engine (Phase 5, Blueprint Section 4)
 * Self-contained Cloud Run service (Codex-aligned). x-agent-secret auth.
 *   POST /inbound                 — routed WhatsApp (complaint/visitor/poll/payment/docs)
 *   POST /billing/generate        — monthly invoices for a project (or all)
 *   POST /billing/confirm-payment — mark invoice paid + issue receipt
 *   POST /ticket/open             — open a complaint
 *   POST /ticket/update           — change ticket status
 *   POST /visitor/log             — guard logs visitor → resident approval prompt
 *   POST /visitor/respond         — resident approve/deny
 *   POST /notice/broadcast        — society broadcast
 *   POST /amenity/book            — book amenity slot
 *   POST /cron/reminders          — daily payment reminder drip
 *   POST /cron/billing            — monthly invoice cron
 *   POST /cron/escalate           — SLA breach pings
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT) || 8087;
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const TOOL_GATEWAY = (process.env.TOOL_GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, '');

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
async function gw(path, body) {
  const r = await fetch(`${TOOL_GATEWAY}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET, 'x-agent-token': AGENT_SECRET } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error ?? `gateway ${path} ${r.status}`);
  return j;
}
const text = (to, body, builder_id) => gw('/whatsapp/send/text', { to: String(to).replace(/^\+/, ''), body, builder_id });
const buttons = (to, body, btns, builder_id) => gw('/whatsapp/send/buttons', { to: String(to).replace(/^\+/, ''), body, buttons: btns, builder_id });
const doc = (to, url, filename, caption, builder_id) => gw('/whatsapp/send/document', { to: String(to).replace(/^\+/, ''), url, filename, caption, builder_id });

const startedAt = Date.now();
app.get('/health', (_req, res) => res.json({ service: 'x7-re-colony-agent', status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) }));
app.get('/health/dependencies', (_req, res) => res.json({ service: 'x7-re-colony-agent', supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), tool_gateway: TOOL_GATEWAY }));
app.use(requireSecret);

// ---- billing ----
function computeAmount(resident, settings) {
  const sqft = resident.plot?.area_sqft;
  const type = sqft ? (sqft >= 1500 ? 'large' : sqft >= 1200 ? 'medium' : 'small') : 'medium';
  if (settings.rate_overrides?.[type]) return Number(settings.rate_overrides[type]);
  if (settings.rate_per_sqft && sqft) return Math.round(Number(settings.rate_per_sqft) * sqft);
  return settings.monthly_rate;
}
async function generateInvoices({ projectId, month, dryRun }) {
  const sb = supabase(); const target = month ?? new Date().toISOString().slice(0, 7);
  let pq = sb.from('projects').select('*, builder:builders(*)'); if (projectId) pq = pq.eq('id', projectId);
  const { data: projects } = await pq;
  let total = 0, sent = 0, failed = 0;
  for (const project of projects ?? []) {
    const { data: settings } = await sb.from('colony_settings').select('*').eq('project_id', project.id).maybeSingle();
    if (!settings) continue;
    const { data: residents } = await sb.from('residents').select('*, plot:plots(area_sqft)').eq('project_id', project.id).neq('status', 'vacant');
    const due = new Date(); due.setDate(settings.billing_day + settings.due_grace_days);
    const due_date = due.toISOString().slice(0, 10);
    for (const r of residents ?? []) {
      total++;
      try {
        const amount = computeAmount(r, settings);
        if (dryRun) continue;
        const { data: invoice, error } = await sb.from('maintenance_invoices').upsert({ project_id: project.id, resident_id: r.id, plot_id: r.plot_id, month: target, amount, due_date, status: 'pending' }, { onConflict: 'resident_id,month' }).select('*').single();
        if (error) throw error;
        let upi = null;
        if (settings.upi_vpa) { const u = await gw('/upi/link', { vpa: settings.upi_vpa, name: settings.upi_name ?? project.builder.company_name, amount, note: `Maintenance ${target}`, transactionRef: `MNT-${invoice.id.slice(0, 8)}`, projectName: project.name }); upi = u.link; }
        let pdfUrl = null;
        try { const p = await gw('/pdf/invoice', { invoice_id: invoice.id, upi_link: upi }); pdfUrl = p.pdf_url; } catch {}
        if (r.phone) {
          const body = `🧾 ${target} ki maintenance bill ready hai.\n\nAmount: ₹${amount.toLocaleString('en-IN')}\nDue: ${due_date}\n` + (upi ? `\nTap to pay: ${upi}` : '');
          if (pdfUrl) await doc(r.phone, pdfUrl, `invoice-${target}.pdf`, body, project.builder_id);
          else await text(r.phone, body, project.builder_id);
        }
        await sb.from('maintenance_invoices').update({ invoice_pdf_url: pdfUrl, upi_payment_link: upi, reminder_sent_at: new Date().toISOString() }).eq('id', invoice.id);
        await sb.from('colony_settings').update({ next_invoice_seq: settings.next_invoice_seq + 1 }).eq('id', settings.id);
        sent++;
      } catch { failed++; }
    }
  }
  return { ok: true, total, sent, failed, month: target };
}
app.post('/billing/generate', async (req, res) => { try { res.json(await generateInvoices({ projectId: req.body?.projectId ?? req.body?.project_id, month: req.body?.month, dryRun: req.body?.dryRun ?? req.body?.dry_run })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/cron/billing', async (req, res) => { try { res.json(await generateInvoices({ projectId: req.body?.project_id, month: req.body?.month })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

// ---- payment confirm + receipt ----
async function confirmPayment({ invoiceId, mode, reference, amount }) {
  const sb = supabase();
  const { data: inv } = await sb.from('maintenance_invoices').select('*, resident:residents(*), project:projects(builder_id)').eq('id', invoiceId).single();
  if (!inv) throw new Error('invoice not found');
  if (inv.status === 'paid') return { ok: true, already_paid: true };
  const { data: settings } = await sb.from('colony_settings').select('*').eq('project_id', inv.project_id).single();
  const receiptNum = `${settings.receipt_prefix}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(settings.next_receipt_seq).padStart(5, '0')}`;
  const { data: receipt } = await sb.from('payment_receipts').insert({ invoice_id: inv.id, project_id: inv.project_id, resident_id: inv.resident_id, receipt_number: receiptNum, amount: amount ?? inv.amount + (inv.late_fee ?? 0), payment_mode: mode ?? 'upi', payment_reference: reference }).select('*').single();
  await sb.from('colony_settings').update({ next_receipt_seq: settings.next_receipt_seq + 1 }).eq('id', settings.id);
  await sb.from('maintenance_invoices').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10), payment_mode: mode ?? 'upi', payment_reference: reference }).eq('id', inv.id);
  let pdfUrl = null; try { const p = await gw('/pdf/receipt', { receipt_id: receipt.id }); pdfUrl = p.pdf_url; } catch {}
  if (inv.resident?.phone) { const cap = `✅ Payment receive ho gaya! Receipt: ${receiptNum}. Amount: ₹${receipt.amount}`; if (pdfUrl) await doc(inv.resident.phone, pdfUrl, `receipt-${receiptNum}.pdf`, cap, inv.project.builder_id); else await text(inv.resident.phone, cap, inv.project.builder_id); }
  return { ok: true, receipt_id: receipt.id, receipt_number: receiptNum, pdf_url: pdfUrl };
}
app.post('/billing/confirm-payment', async (req, res) => { try { res.json(await confirmPayment({ invoiceId: req.body?.invoice_id, mode: req.body?.mode, reference: req.body?.reference, amount: req.body?.amount })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

// ---- reminders ----
app.post('/cron/reminders', async (_req, res) => {
  try {
    const sb = supabase();
    const { data: allSettings } = await sb.from('colony_settings').select('*');
    const byProject = new Map((allSettings ?? []).map((s) => [s.project_id, s]));
    const { data: pending } = await sb.from('maintenance_invoices').select('*, resident:residents(phone, name), project:projects(builder_id)').in('status', ['pending', 'overdue']).order('due_date', { ascending: true }).limit(500);
    let sent = 0, applied = 0, skipped = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const inv of pending ?? []) {
      const s = byProject.get(inv.project_id); if (!s) { skipped++; continue; }
      const due = new Date(inv.due_date); due.setHours(0, 0, 0, 0);
      const daysLate = Math.floor((today - due) / 864e5); if (daysLate < 0) { skipped++; continue; }
      let lateFee = inv.late_fee ?? 0;
      if (daysLate >= s.late_fee_after_days && (inv.late_fee ?? 0) === 0) { lateFee = s.late_fee_amount; await sb.from('maintenance_invoices').update({ late_fee: lateFee, status: 'overdue' }).eq('id', inv.id); applied++; }
      let tone = null;
      if (daysLate === s.reminder_day_1) tone = `🔔 ${inv.month} maintenance ₹${inv.amount} pending hai (${daysLate} din late).`;
      else if (daysLate === s.reminder_day_2) tone = `⚠️ ${inv.month} ka ₹${inv.amount} abhi tak nahi mila. Late fee jaldi start hogi.`;
      else if (daysLate === s.reminder_day_3) tone = `🚨 ${inv.month} ka ₹${inv.amount} + ₹${lateFee} late fee aaj se applicable.`;
      if (!tone) { skipped++; continue; }
      if (inv.resident?.phone) { await text(inv.resident.phone, tone + (inv.upi_payment_link ? `\nPay: ${inv.upi_payment_link}` : ''), inv.project.builder_id); sent++; }
      await sb.from('maintenance_invoices').update({ reminder_sent_at: new Date().toISOString(), reminder_count: (inv.reminder_count ?? 0) + 1 }).eq('id', inv.id);
    }
    res.json({ ok: true, sent, late_fees_applied: applied, skipped });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---- complaints ----
const CAT_KW = { plumbing: ['plumb','pipe','tap','nal','pani','leak','toilet','drain'], electrical: ['electric','bulb','light','fan','power','bijli','wiring','switch'], water: ['pani','water','supply'], lift: ['lift','elevator'], cleanliness: ['safai','kachra','garbage','clean'], security: ['security','guard','chori','intruder'], road: ['road','sadak','pothole'] };
const STAFF_FOR = { plumbing: 'plumber', water: 'plumber', sewage: 'plumber', electrical: 'electrician', street_light: 'electrician', lift: 'electrician', cleanliness: 'cleaner', garbage: 'cleaner', security: 'guard' };
function categorize(t) { const s = String(t ?? '').toLowerCase(); for (const [c, kws] of Object.entries(CAT_KW)) if (kws.some((k) => s.includes(k))) return c; return 'other'; }
function priority(t, cat) { const s = String(t ?? '').toLowerCase(); if (/emergency|urgent|aag|fire|flood/.test(s)) return 'critical'; if (cat === 'security' || cat === 'lift') return 'high'; return 'medium'; }
async function openTicket({ resident, body, photoUrl, priority: pr }) {
  const sb = supabase(); const cat = categorize(body); const prio = pr ?? priority(body, cat);
  const { data: complaint, error } = await sb.from('complaints').insert({ project_id: resident.project_id, resident_id: resident.id, category: cat, description: body, photo_url: photoUrl ?? null, priority: prio, status: 'open' }).select('*').single();
  if (error) throw error;
  const { data: staff } = await sb.from('colony_staff').select('*').eq('project_id', resident.project_id).eq('role', STAFF_FOR[cat] ?? 'supervisor').eq('active', true).limit(1);
  if (staff?.length) {
    await sb.from('complaints').update({ assigned_to: staff[0].name }).eq('id', complaint.id);
    if (staff[0].phone) await text(staff[0].phone, `🛠 Naya ticket: ${cat} (${prio}). Flat: ${resident.name}.\n${String(body).slice(0, 200)}`, null);
    await sb.from('complaint_updates').insert({ complaint_id: complaint.id, update_type: 'assignment', body: `Auto-assigned to ${staff[0].name}`, from_role: 'system', visible_to_resident: false });
  }
  await sb.from('complaint_updates').insert({ complaint_id: complaint.id, update_type: 'comment', body, from_role: 'resident', from_name: resident.name });
  if (resident.phone) await text(resident.phone, `✅ Ticket #${complaint.id.slice(0, 6)} register ho gaya — ${cat}. Team ko inform kar diya.`, null);
  return { ok: true, complaint };
}
app.post('/ticket/open', async (req, res) => { try { res.json(await openTicket(req.body ?? {})); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/ticket/update', async (req, res) => {
  try {
    const sb = supabase(); const { complaint_id, status, note, by_name, by_role = 'secretary' } = req.body ?? {};
    const patch = { status }; if (status === 'resolved') patch.resolved_at = new Date().toISOString(); if (status === 'closed') patch.closed_at = new Date().toISOString(); if (note) patch.resolution_notes = note;
    const { data: complaint } = await sb.from('complaints').update(patch).eq('id', complaint_id).select('*, resident:residents(phone), project:projects(builder_id)').single();
    await sb.from('complaint_updates').insert({ complaint_id, update_type: 'status_change', body: `Status → ${status}` + (note ? `\n${note}` : ''), from_role: by_role, from_name: by_name });
    const msg = { in_progress: '🔧 Aapke ticket pe kaam shuru ho gaya.', resolved: '✅ Ticket resolved! ' + (note ?? ''), closed: '👍 Ticket band. Thank you!', reopened: '🔁 Ticket reopen ho gaya.' }[status];
    if (msg && complaint?.resident?.phone) await text(complaint.resident.phone, `${msg}\nTicket #${complaint_id.slice(0, 6)}`, complaint.project.builder_id);
    res.json({ ok: true, complaint });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/cron/escalate', async (_req, res) => {
  try { const sb = supabase(); const { data: breached } = await sb.from('v_ticket_sla').select('*').eq('sla_breached', true).limit(50);
    for (const t of breached ?? []) await sb.from('complaint_updates').insert({ complaint_id: t.id, update_type: 'reminder', body: `SLA breached — ${Math.round(t.hours_open)}h open`, from_role: 'system', visible_to_resident: false });
    res.json({ ok: true, escalated: breached?.length ?? 0 }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---- visitors ----
async function logVisitor({ projectId, residentId, name, phone, purpose, vehicle, type = 'guest' }) {
  const sb = supabase();
  const { data: visitor, error } = await sb.from('visitors').insert({ project_id: projectId, resident_id: residentId, visitor_name: name, visitor_phone: phone, purpose, vehicle_number: vehicle, visitor_type: type, approval_status: 'pending' }).select('*').single();
  if (error) throw error;
  const { data: resident } = await sb.from('residents').select('phone, name').eq('id', residentId).single();
  const { data: project } = await sb.from('projects').select('builder_id').eq('id', projectId).single();
  if (resident?.phone) await buttons(resident.phone, `🚪 ${name} aapse milne aaye hain${purpose ? ` (${purpose})` : ''}. Allow?\nVehicle: ${vehicle ?? '—'}`, [{ id: `colony_visitor_approve_${visitor.id}`, title: '✅ Allow' }, { id: `colony_visitor_deny_${visitor.id}`, title: '❌ Deny' }], project.builder_id);
  return { ok: true, visitor };
}
async function respondVisitor({ visitorId, approved, byName }) {
  const sb = supabase();
  const { data: visitor } = await sb.from('visitors').update({ approval_status: approved ? 'approved' : 'denied', approved_by: byName ?? 'Resident', approval_method: 'whatsapp' }).eq('id', visitorId).select('*, project:projects(builder_id)').single();
  const { data: guards } = await sb.from('colony_staff').select('phone').eq('project_id', visitor.project_id).eq('role', 'guard').eq('active', true);
  for (const g of guards ?? []) if (g.phone) await text(g.phone, approved ? `✅ ${visitor.visitor_name} approved. Allow entry.` : `❌ ${visitor.visitor_name} denied.`, visitor.project.builder_id);
  return { ok: true, visitor };
}
app.post('/visitor/log', async (req, res) => { try { const { project_id, resident_id, name, phone, purpose, vehicle, type } = req.body ?? {}; res.json(await logVisitor({ projectId: project_id, residentId: resident_id, name, phone, purpose, vehicle, type })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/visitor/respond', async (req, res) => { try { res.json(await respondVisitor({ visitorId: req.body?.visitor_id, approved: req.body?.approved, byName: req.body?.by_name })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

// ---- notices ----
async function broadcast({ noticeId }) {
  const sb = supabase();
  const { data: notice } = await sb.from('notices').select('*').eq('id', noticeId).single();
  if (!notice) throw new Error('notice not found');
  if (notice.status === 'sent') return { ok: true, already_sent: true };
  let q = sb.from('residents').select('id, phone, name, status, plot:plots(block)').eq('project_id', notice.project_id).neq('status', 'vacant').not('phone', 'is', null);
  if (notice.target === 'owners') q = q.in('status', ['owner', 'co_owner']);
  if (notice.target === 'tenants') q = q.eq('status', 'tenant');
  const { data: rows } = await q;
  let recipients = rows ?? [];
  const f = notice.target_filter ?? {};
  if (notice.target === 'block' && f.block) recipients = recipients.filter((r) => r.plot?.block === f.block);
  if (notice.target === 'custom' && Array.isArray(f.resident_ids)) { const set = new Set(f.resident_ids); recipients = recipients.filter((r) => set.has(r.id)); }
  await sb.from('notices').update({ status: 'sending', recipient_count: recipients.length }).eq('id', noticeId);
  let delivered = 0, failed = 0;
  for (const r of recipients) {
    try {
      const body = `📢 ${notice.title}\n\n${notice.body_hindi ?? notice.body}`;
      if (notice.poll_options?.length) await buttons(r.phone, body, notice.poll_options.slice(0, 3).map((o) => ({ id: `colony_poll_${noticeId}_${o.id}`, title: String(o.label).slice(0, 20) })), notice.builder_id);
      else await text(r.phone, body, notice.builder_id);
      delivered++;
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 100));
  }
  await sb.from('notices').update({ status: failed > 0 && delivered === 0 ? 'failed' : 'sent', sent_at: new Date().toISOString(), delivered_count: delivered }).eq('id', noticeId);
  return { ok: true, recipients: recipients.length, delivered, failed };
}
app.post('/notice/broadcast', async (req, res) => { try { res.json(await broadcast({ noticeId: req.body?.notice_id })); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

// ---- amenity booking ----
function overlap(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
function hoursBetween(a, b) { const [ah, am] = a.split(':').map(Number); const [bh, bm] = b.split(':').map(Number); return Math.max(1, ((bh - ah) * 60 + (bm - am)) / 60); }
app.post('/amenity/book', async (req, res) => {
  try {
    const sb = supabase(); const { amenity_id, resident_id, date, start_time, end_time, guests = 1 } = req.body ?? {};
    const { data: amenity } = await sb.from('amenities').select('*').eq('id', amenity_id).single();
    if (!amenity || !amenity.enabled) return res.status(400).json({ ok: false, error: 'amenity not available' });
    const { data: conflicts } = await sb.from('amenity_bookings').select('start_time, end_time').eq('amenity_id', amenity_id).eq('booking_date', date).neq('status', 'cancelled');
    for (const c of conflicts ?? []) if (overlap(c.start_time, c.end_time, start_time, end_time)) return res.status(409).json({ ok: false, error: `slot booked (${c.start_time}-${c.end_time})` });
    const fee = (amenity.hourly_rate ?? 0) * hoursBetween(start_time, end_time);
    let upiLink = null;
    if (fee > 0) { const { data: s } = await sb.from('colony_settings').select('upi_vpa,upi_name').eq('project_id', amenity.project_id).maybeSingle(); if (s?.upi_vpa) { const u = await gw('/upi/link', { vpa: s.upi_vpa, name: s.upi_name, amount: fee, note: `${amenity.name} ${date}`, transactionRef: `AMN-${Date.now()}` }); upiLink = u.link; } }
    const { data: booking, error } = await sb.from('amenity_bookings').insert({ amenity_id, resident_id, project_id: amenity.project_id, booking_date: date, start_time, end_time, guests, fee, paid: fee === 0, upi_payment_link: upiLink, status: 'confirmed' }).select('*').single();
    if (error) throw error;
    res.json({ ok: true, booking, upi_link: upiLink, fee });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---- inbound (routed WhatsApp) ----
app.post('/inbound', async (req, res) => {
  try {
    const sb = supabase(); const { message, resident, builder } = req.body ?? {};
    if (!resident) return res.json({ ok: true, handled: false, reason: 'no_resident' });
    const t = message?.text ?? ''; const rid = message?.button_reply_id ?? '';
    if (rid.startsWith('colony_visitor_approve_')) { await respondVisitor({ visitorId: rid.replace('colony_visitor_approve_', ''), approved: true, byName: resident.name }); return res.json({ ok: true, action: 'visitor_approved' }); }
    if (rid.startsWith('colony_visitor_deny_')) { await respondVisitor({ visitorId: rid.replace('colony_visitor_deny_', ''), approved: false, byName: resident.name }); return res.json({ ok: true, action: 'visitor_denied' }); }
    if (rid.startsWith('colony_poll_')) { const [, , noticeId, optionId] = rid.split('_'); const { data: n } = await sb.from('notices').select('poll_responses, poll_options').eq('id', noticeId).single(); const responses = { ...(n?.poll_responses ?? {}), [resident.id]: optionId }; const options = (n?.poll_options ?? []).map((o) => o.id === optionId ? { ...o, votes: (o.votes ?? 0) + 1 } : o); await sb.from('notices').update({ poll_responses: responses, poll_options: options }).eq('id', noticeId); return res.json({ ok: true, action: 'poll_response' }); }
    if (/payment|paisa|invoice|maintenance/i.test(t)) {
      const { data: pend } = await sb.from('maintenance_invoices').select('month, amount, due_date, late_fee, upi_payment_link').eq('resident_id', resident.id).in('status', ['pending', 'overdue']).order('due_date', { ascending: true }).limit(5);
      if (!pend?.length) { if (resident.phone) await text(resident.phone, '✅ Koi pending payment nahi hai. Thank you!', builder?.id); return res.json({ ok: true, action: 'no_pending' }); }
      const total = pend.reduce((s, p) => s + p.amount + (p.late_fee ?? 0), 0); const upi = pend.find((p) => p.upi_payment_link)?.upi_payment_link;
      if (resident.phone) await text(resident.phone, `💰 Pending:\n${pend.map((p) => `${p.month}: ₹${p.amount} (due ${p.due_date})`).join('\n')}\n\nTotal: ₹${total}${upi ? `\nPay: ${upi}` : ''}`, builder?.id);
      return res.json({ ok: true, action: 'payment_status' });
    }
    if (/document|noc|registry|sale deed/i.test(t)) {
      const { data: docs } = await sb.from('documents').select('title, file_url').or(`resident_id.eq.${resident.id},visible_to_residents.eq.true`).eq('project_id', resident.project_id).limit(5);
      if (resident.phone) await text(resident.phone, docs?.length ? `📁 Documents:\n${docs.map((d, i) => `${i + 1}. ${d.title}\n${d.file_url}`).join('\n')}` : 'Koi document abhi upload nahi hua.', builder?.id);
      return res.json({ ok: true, action: 'docs' });
    }
    const r = await openTicket({ resident, body: t });
    res.json({ ok: true, action: 'ticket_opened', complaint_id: r.complaint.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message ?? 'internal error' }));
app.listen(PORT, () => console.log(JSON.stringify({ service: 'x7-re-colony-agent', msg: 'listening', port: PORT })));
