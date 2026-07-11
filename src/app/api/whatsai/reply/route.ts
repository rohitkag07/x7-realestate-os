import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  builder_id: z.string().min(1),
  business_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  phone: z.string().min(8),
  body: z.string().min(1).max(4096),
  agent: z.string().default('whatsai-operator').optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const sent = await sendWhatsAppText(payload.phone, payload.body);
  const supabase = serviceClientOrNull();
  let messageRow = null;

  if (supabase) {
    const inserted = await (supabase.from('whatsapp_messages') as any)
      .insert({
        builder_id: payload.builder_id,
        lead_id: payload.lead_id ?? null,
        direction: 'outbound',
        phone: normalizePhone(payload.phone),
        wa_message_id: sent.message_id ?? null,
        message_type: 'text',
        body: payload.body,
        status: sent.ok ? 'sent' : 'failed',
        error: sent.ok ? null : sent.error ?? sent.reason ?? 'whatsapp_send_failed',
        agent: payload.agent ?? 'whatsai-operator',
        template_params: payload.business_id ? [{ business_id: payload.business_id }] : [],
      })
      .select()
      .single();

    messageRow = inserted.data ?? null;

    await (supabase.from('agent_runs') as any).insert({
      builder_id: payload.builder_id,
      lead_id: payload.lead_id ?? null,
      agent: 'whatsai-assistant',
      action: 'manual-reply',
      input: payload,
      output: { sent, message_id: messageRow?.id ?? null },
      status: sent.ok ? 'success' : 'partial',
      error: sent.ok ? null : sent.error ?? sent.reason ?? 'whatsapp_send_failed',
    });

    if (payload.business_id) {
      await upsertConversationMirror({
        supabase,
        payload,
        whatsappMessageId: messageRow?.id ?? null,
        status: sent.ok ? 'sent' : 'failed',
      });
    }
  }

  return NextResponse.json({
    ok: sent.ok,
    sent,
    message: messageRow,
  }, { status: sent.ok ? 200 : 202 });
}

async function sendWhatsAppText(to: string, body: string) {
  const toolGatewayUrl = (process.env.TOOL_GATEWAY_URL || '').replace(/\/$/, '');
  const agentSecret = process.env.AGENT_SECRET || '';
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

  if (toolGatewayUrl) {
    try {
      const response = await fetch(`${toolGatewayUrl}/whatsapp/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}),
        },
        body: JSON.stringify({ to: normalizeOutboundPhone(to), body }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok) {
        return { ok: true, transport: 'tool_gateway', message_id: data.wa_message_id ?? data.message_id ?? null };
      }
      if (!phoneNumberId || !accessToken) {
        return { ok: false, transport: 'tool_gateway', error: data?.error || `tool_gateway_${response.status}` };
      }
    } catch (error) {
      if (!phoneNumberId || !accessToken) {
        return { ok: false, transport: 'tool_gateway', error: error instanceof Error ? error.message : 'tool_gateway_unreachable' };
      }
    }
  }

  if (!phoneNumberId || !accessToken) {
    return { ok: false, skipped: true, reason: 'missing_whatsapp_env' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizeOutboundPhone(to),
        type: 'text',
        text: { body, preview_url: true },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, transport: 'direct_graph', error: data?.error?.message || response.statusText };
    }
    return { ok: true, transport: 'direct_graph', message_id: data?.messages?.[0]?.id ?? null };
  } catch (error) {
    return { ok: false, transport: 'direct_graph', error: error instanceof Error ? error.message : 'whatsapp_send_failed' };
  }
}

async function upsertConversationMirror({
  supabase,
  payload,
  whatsappMessageId,
  status,
}: {
  supabase: any;
  payload: z.infer<typeof schema>;
  whatsappMessageId: string | null;
  status: 'sent' | 'failed';
}) {
  const phone = normalizePhone(payload.phone);
  const contact = await (supabase.from('conversation_contacts') as any)
    .upsert({
      business_id: payload.business_id,
      builder_id: payload.builder_id,
      lead_id: payload.lead_id ?? null,
      phone,
      source: 'whatsapp',
      lifecycle_stage: 'lead',
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'business_id,phone' })
    .select()
    .single();

  const contactId = contact.data?.id ?? null;
  let thread = { data: null as any };
  if (contactId) {
    const existingThread = await (supabase.from('conversation_threads') as any)
      .select('*')
      .eq('contact_id', contactId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    thread = existingThread.data
      ? await (supabase.from('conversation_threads') as any)
          .update({
            status: 'open',
            ai_mode: 'manual',
            last_message_at: new Date().toISOString(),
          })
          .eq('id', existingThread.data.id)
          .select()
          .single()
      : await (supabase.from('conversation_threads') as any)
          .insert({
            business_id: payload.business_id,
            contact_id: contactId,
            builder_id: payload.builder_id,
            lead_id: payload.lead_id ?? null,
            channel: 'whatsapp',
            status: 'open',
            ai_mode: 'manual',
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
  }

  await (supabase.from('conversation_messages') as any).insert({
    thread_id: thread.data?.id ?? null,
    contact_id: contactId,
    business_id: payload.business_id,
    builder_id: payload.builder_id,
    lead_id: payload.lead_id ?? null,
    whatsapp_message_id: whatsappMessageId,
    direction: 'outbound',
    channel: 'whatsapp',
    message_type: 'text',
    body: payload.body,
    status,
    agent: payload.agent ?? 'whatsai-operator',
  });
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return value.startsWith('+') ? value : `+${digits}`;
}

function normalizeOutboundPhone(value: string) {
  return String(value || '').replace(/\D/g, '');
}
