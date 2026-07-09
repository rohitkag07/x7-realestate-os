import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTrialConsoleData } from '@/lib/trial-console';
import { createServiceClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  id: z.string().uuid(),
  is_done: z.boolean(),
});

export async function GET() {
  const data = await getTrialConsoleData();

  return NextResponse.json({
    ok: true,
    source: data.trial.source,
    business_id: data.trial.businessId,
    checklist_completion: data.checklistCompletion,
    checklist: data.checklist,
  });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid checklist payload' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const { data, error } = await (supabase.from('business_setup_checklist') as any)
    .update({
      is_done: parsed.data.is_done,
      completed_at: parsed.data.is_done ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.id)
    .select('id, step_key, step_label, is_done, completed_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, step: data });
}
