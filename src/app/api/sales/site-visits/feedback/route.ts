import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logAgentRun, serviceClientOrNull } from '@/lib/sales-server';

const schema = z.object({
  id: z.string().optional(),
  builder_id: z.string().optional(),
  lead_id: z.string().optional(),
  project_id: z.string().optional(),
  feedback: z.string().min(2),
  interest_level: z.enum(['very_high', 'high', 'medium', 'low']),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  let visit: Record<string, unknown> = {
    id: payload.id,
    feedback: payload.feedback,
    interest_level: payload.interest_level,
    status: 'completed',
  };

  const supabase = serviceClientOrNull();
  if (supabase && payload.id) {
    const updated = await (supabase.from('site_visits') as any).update({
      feedback: payload.feedback,
      interest_level: payload.interest_level,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', payload.id).select().single();
    if (!updated.error && updated.data) visit = updated.data;
  }

  await logAgentRun({
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    action: 'dashboard-site-visit-feedback',
    input: payload as Record<string, unknown>,
    output: { visit },
  });

  return NextResponse.json({ ok: true, visit });
}
