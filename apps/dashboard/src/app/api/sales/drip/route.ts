import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callSalesAgent, fallbackDrip, logAgentRun, serviceClientOrNull } from '@/lib/sales-server';

const schema = z.object({
  lead_id: z.string(),
  builder_id: z.string(),
  lead_name: z.string().min(2),
  lead_stage: z.enum(['new', 'qualified', 'visit_scheduled', 'visited', 'negotiation', 'booked', 'lost']),
  project_id: z.string().optional(),
  phone: z.string().optional(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const agentResponse = await callSalesAgent<{ ok: boolean; steps: Array<Record<string, unknown>> }>('/drip', payload);
  const steps = agentResponse?.steps ?? fallbackDrip({
    leadName: payload.lead_name,
    leadStage: payload.lead_stage,
    locale: payload.locale,
  });

  const supabase = serviceClientOrNull();
  if (supabase) {
    await (supabase.from('follow_up_queue') as any).upsert(
      steps.map((step) => ({
        builder_id: payload.builder_id,
        lead_id: payload.lead_id,
        step: `phase2_${String(step.step)}`,
        scheduled_for: String(step.scheduled_for),
        status: 'pending',
        payload: {
          body: step.body,
          lead_stage: payload.lead_stage,
        },
      })),
      { onConflict: 'lead_id,step' },
    );
  }

  await logAgentRun({
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    action: 'dashboard-drip',
    input: payload as Record<string, unknown>,
    output: { stepsCount: steps.length, source: agentResponse ? 'agent' : 'fallback' },
  });

  return NextResponse.json({ ok: true, steps, source: agentResponse ? 'agent' : 'fallback' });
}
