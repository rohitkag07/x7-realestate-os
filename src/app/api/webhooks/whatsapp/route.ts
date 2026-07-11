import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { persistLeadToAppointmentFlow } from '@/lib/whatsai-lead-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getEnv() {
  return {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    metaAppSecret: process.env.META_APP_SECRET || '',
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v22.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    defaultBuilderId: process.env.DEFAULT_BUILDER_ID || null,
    defaultProjectId: process.env.DEFAULT_PROJECT_ID || null,
  };
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function normalizeOutboundPhone(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

function mapInboundType(type: string | null | undefined) {
  if (type === 'button') return 'button_reply';
  if (type === 'interactive') return 'list_reply';
  return type || 'text';
}

function mapStatus(status: string | null | undefined) {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
    case 'failed':
      return status;
    default:
      return 'sent';
  }
}

function extractBody(message: any) {
  if (message?.text?.body) return message.text.body;
  if (message?.button?.text) return message.button.text;
  if (message?.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message?.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  if (message?.image?.caption) return message.image.caption;
  if (message?.document?.caption) return message.document.caption;
  return '';
}

function validateSignature(rawBody: string, signature: string | null) {
  const { metaAppSecret } = getEnv();
  if (!metaAppSecret) return true;
  if (!signature?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto.createHmac('sha256', metaAppSecret).update(rawBody, 'utf8').digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function buildSalesReply(name: string, body: string) {
  const lower = body.toLowerCase();

  if (/(visit|site visit|site|dekhna|dekhni|schedule)/.test(lower)) {
    return `${name} ji, site visit ke liye best. Main aapko 11:00 AM ya 4:00 PM ka slot hold kara sakta hoon. Aapko kaunsa theek rahega?\n\nThis looks visit-ready. I can hold a site-visit slot for 11:00 AM or 4:00 PM. Which works better for you?`;
  }

  if (/(brochure|price|pricing|details|cost|plot)/.test(lower)) {
    return `${name} ji, brochure aur latest price details ready hain. Agar aap chaho to main aapke budget ke hisaab se best options short-list karke bhej sakta hoon.\n\nYour brochure and latest price details are ready. If you want, I can shortlist the best options based on your budget and send them right away.`;
  }

  return `${name} ji, aapka message receive ho gaya hai. Main aapki requirement ke hisaab se next best option lekar turant reply karta hoon.\n\nYour message has been received. I’ll reply with the best next step for your requirement shortly.`;
}

function buildResidentReply(name: string) {
  return `${name} ji, aapka colony message receive ho gaya hai. Secretary/operations team is par action le rahi hai aur aapko update WhatsApp par milega.\n\nYour colony request has been received. The operations team is reviewing it and will update you on WhatsApp.`;
}

async function sendWhatsAppText(to: string, body: string) {
  const { phoneNumberId, accessToken, graphVersion } = getEnv();
  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: 'missing_whatsapp_env' };
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizeOutboundPhone(to),
      type: 'text',
      text: { body, preview_url: true },
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: payload?.error?.message || response.statusText };
  }

  return {
    ok: true,
    wa_message_id: payload?.messages?.[0]?.id ?? null,
    status: 'sent',
  };
}

async function recordMessage(supabase: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  const { error } = await (supabase.from('whatsapp_messages') as any).insert(payload);
  if (!error) return;

  if (payload.wa_message_id && error.code === '23505') {
    await (supabase.from('whatsapp_messages') as any)
      .update(payload)
      .eq('wa_message_id', payload.wa_message_id);
  }
}

async function logRun(supabase: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  await (supabase.from('agent_runs') as any).insert(payload);
}

async function updateStatuses(supabase: ReturnType<typeof createServiceClient>, statuses: any[]) {
  for (const status of statuses || []) {
    if (!status?.id) continue;
    await (supabase.from('whatsapp_messages') as any)
      .update({
        status: mapStatus(status.status),
        error: status?.errors?.[0]?.title ?? null,
      })
      .eq('wa_message_id', status.id);
  }
}

async function findResidentByPhone(supabase: ReturnType<typeof createServiceClient>, phone: string) {
  const candidates = [phone, normalizePhone(phone), normalizeOutboundPhone(phone)];
  for (const candidate of candidates) {
    const { data } = await (supabase.from('residents') as any)
      .select('id, project_id, name, phone, status')
      .eq('phone', candidate)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function findLeadByPhone(supabase: ReturnType<typeof createServiceClient>, phone: string) {
  const candidates = [phone, normalizePhone(phone), normalizeOutboundPhone(phone)];
  for (const candidate of candidates) {
    const { data } = await (supabase.from('leads') as any)
      .select('id, builder_id, project_id, name, phone, lead_stage')
      .eq('phone', candidate)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function resolveBuilderProject(supabase: ReturnType<typeof createServiceClient>, resident: any, lead: any) {
  const { defaultBuilderId, defaultProjectId } = getEnv();
  if (resident?.project_id) {
    const { data } = await (supabase.from('projects') as any)
      .select('id, builder_id')
      .eq('id', resident.project_id)
      .maybeSingle();
    if (data) return { builderId: data.builder_id, projectId: data.id };
  }

  return {
    builderId: lead?.builder_id || defaultBuilderId,
    projectId: resident?.project_id || lead?.project_id || defaultProjectId,
  };
}

async function createLeadFromInbound(supabase: ReturnType<typeof createServiceClient>, phone: string, builderId: string | null, projectId: string | null) {
  if (!builderId) return null;

  const { data } = await (supabase.from('leads') as any)
    .insert({
      builder_id: builderId,
      project_id: projectId,
      name: `WhatsApp Lead ${phone.slice(-4)}`,
      phone,
      source: 'whatsapp',
      lead_stage: 'new',
      temperature: 'warm',
      lead_score: 36,
      notes: 'Auto-created from public WhatsApp webhook.',
      last_contacted_at: new Date().toISOString(),
    })
    .select('id, builder_id, project_id, name, phone, lead_stage')
    .single();

  return data ?? null;
}

async function handleInboundMessage(supabase: ReturnType<typeof createServiceClient>, message: any, envelope: any) {
  const phone = normalizePhone(message?.from);
  const body = extractBody(message);
  const resident = await findResidentByPhone(supabase, phone);
  let lead = resident ? null : await findLeadByPhone(supabase, phone);

  let { builderId, projectId } = await resolveBuilderProject(supabase, resident, lead);
  if (!resident && !lead && builderId) {
    lead = await createLeadFromInbound(supabase, phone, builderId, projectId);
  }
  if (!builderId && lead?.builder_id) builderId = lead.builder_id;
  if (!projectId && lead?.project_id) projectId = lead.project_id;

  if (builderId) {
    await recordMessage(supabase, {
      builder_id: builderId,
      lead_id: lead?.id ?? null,
      resident_id: resident?.id ?? null,
      direction: 'inbound',
      phone,
      wa_message_id: message.id,
      message_type: mapInboundType(message.type),
      body: body || null,
      media_url: null,
      interactive_payload: message.interactive ?? {},
      status: 'received',
      error: null,
      agent: resident ? 'public-whatsapp-colony' : 'public-whatsapp-sales',
      template_params: projectId ? [{ project_id: projectId }] : [],
    });

    if (!resident) {
      await persistLeadToAppointmentFlow(supabase, {
        builderId,
        projectId,
        leadId: lead?.id ?? null,
        phone,
        name: lead?.name ?? null,
        source: 'whatsapp',
        body,
        waMessageId: message.id,
      });
    }
  }

  if (!builderId || !body) return;

  const replyBody = resident
    ? buildResidentReply(resident.name || 'Resident')
    : buildSalesReply(lead?.name || `Lead ${phone.slice(-4)}`, body);

  const outbound = await sendWhatsAppText(phone, replyBody);

  await recordMessage(supabase, {
    builder_id: builderId,
    lead_id: lead?.id ?? null,
    resident_id: resident?.id ?? null,
    direction: 'outbound',
    phone,
    wa_message_id: outbound.ok ? outbound.wa_message_id : null,
    message_type: 'text',
    body: replyBody,
    media_url: null,
    interactive_payload: {},
    status: outbound.ok ? 'sent' : 'failed',
    error: outbound.ok ? null : outbound.error,
    agent: resident ? 'public-whatsapp-colony-reply' : 'public-whatsapp-sales-reply',
    template_params: projectId ? [{ project_id: projectId }] : [],
  });

  await logRun(supabase, {
    builder_id: builderId,
    agent: 'dashboard-webhook',
    action: resident ? 'webhook-inbound-colony-public' : 'webhook-inbound-sales-public',
    lead_id: lead?.id ?? null,
    project_id: projectId ?? null,
    input: {
      from: phone,
      body,
      message_type: message.type,
      metadata: envelope?.metadata ?? null,
    },
    output: {
      reply: replyBody,
      outbound,
    },
    status: outbound.ok ? 'success' : 'partial',
    error: outbound.ok ? null : outbound.error,
  });
}

export async function GET(request: Request) {
  const { verifyToken } = getEnv();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(String(challenge ?? ''), { status: 200 });
  }

  return NextResponse.json({ ok: false, error: 'Webhook verification failed.' }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ ok: false, error: 'Invalid Meta signature.' }, { status: 401 });
  }

  const payload = rawBody ? JSON.parse(rawBody) : {};
  const supabase = createServiceClient();
  const changes = payload?.entry?.flatMap((entry: any) => entry?.changes || []) || [];

  for (const change of changes) {
    const value = change?.value || {};
    await updateStatuses(supabase, value.statuses || []);

    for (const message of value.messages || []) {
      if (message?.from) {
        await handleInboundMessage(supabase, message, value);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
