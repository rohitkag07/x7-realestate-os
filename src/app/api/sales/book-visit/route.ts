import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildVisitReminderSteps,
  callSalesAgent,
  fallbackBookingConfirmation,
  logAgentRun,
  serviceClientOrNull,
} from '@/lib/sales-server';

const schema = z.object({
  lead_id: z.string(),
  builder_id: z.string(),
  project_id: z.string(),
  lead_name: z.string().min(2),
  phone: z.string(),
  scheduled_date: z.string(),
  scheduled_time: z.string(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const agentResponse = await callSalesAgent<{ ok: boolean; visit?: Record<string, unknown>; response?: Record<string, unknown> }>('/book-visit', payload);
  const confirmation = agentResponse?.response ?? fallbackBookingConfirmation({
    date: payload.scheduled_date,
    time: payload.scheduled_time,
    locale: payload.locale,
  });
  const reminderSteps = buildVisitReminderSteps({
    leadName: payload.lead_name,
    date: payload.scheduled_date,
    time: payload.scheduled_time,
    locale: payload.locale,
  });

  let visit: Record<string, unknown> = agentResponse?.visit ?? {
    lead_id: payload.lead_id,
    project_id: payload.project_id,
    scheduled_date: payload.scheduled_date,
    scheduled_time: payload.scheduled_time,
    status: 'scheduled',
  };

  const supabase = serviceClientOrNull();
  if (supabase) {
    const inserted = await (supabase.from('site_visits') as any).insert({
      lead_id: payload.lead_id,
      project_id: payload.project_id,
      scheduled_date: payload.scheduled_date,
      scheduled_time: payload.scheduled_time,
      status: 'scheduled',
      follow_up_action: 'Send route map + day-before reminder',
    }).select().single();
    if (!inserted.error && inserted.data) visit = inserted.data;

    await (supabase.from('whatsapp_messages') as any).insert({
      builder_id: payload.builder_id,
      lead_id: payload.lead_id,
      direction: 'outbound',
      phone: payload.phone,
      body: String((confirmation as { bilingual?: string }).bilingual ?? ''),
      message_type: 'text',
      status: 'queued',
      agent: 'sales-agent-proxy',
    });

    await (supabase.from('follow_up_queue') as any).upsert(
      reminderSteps.map((step) => ({
        builder_id: payload.builder_id,
        lead_id: payload.lead_id,
        step: `phase2_${step.step}`,
        scheduled_for: step.scheduled_for,
        status: 'pending',
        payload: {
          visit_date: payload.scheduled_date,
          visit_time: payload.scheduled_time,
          body: step.body,
        },
      })),
      { onConflict: 'lead_id,step' },
    );
  }

  await logAgentRun({
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    action: 'dashboard-book-visit',
    input: payload as Record<string, unknown>,
    output: { visit, confirmation, reminderSteps, source: agentResponse ? 'agent' : 'fallback' },
  });

  return NextResponse.json({
    ok: true,
    visit,
    response: confirmation,
    reminder_steps: reminderSteps,
    source: agentResponse ? 'agent' : 'fallback',
  });
}
