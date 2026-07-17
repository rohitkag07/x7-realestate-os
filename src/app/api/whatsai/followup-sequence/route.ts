import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';

export const runtime = 'nodejs';

const schema = z.object({
  business_id: z.string().uuid(),
  playbook_id: z.string().uuid().nullable().optional(),
  enabled: z.boolean().default(true),
  steps: z.array(z.object({
    day: z.number().int().min(0).max(90),
    message: z.string().trim().min(3).max(1000),
  })).min(1).max(7),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });

  const payload = parsed.data;
  const values = {
    business_id: payload.business_id,
    playbook_id: payload.playbook_id ?? null,
    name: 'Default lead follow-up',
    steps: payload.steps,
    active: payload.enabled,
    updated_at: new Date().toISOString(),
  };
  let existingQuery = (supabase.from('followup_sequences') as any)
    .select('id')
    .eq('business_id', payload.business_id)
    .eq('active', true);
  existingQuery = payload.playbook_id ? existingQuery.eq('playbook_id', payload.playbook_id) : existingQuery.is('playbook_id', null);
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
  if (lookupError) return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  const { data, error } = existing
    ? await (supabase.from('followup_sequences') as any).update(values).eq('id', existing.id).select().single()
    : await (supabase.from('followup_sequences') as any).insert(values).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sequence: data });
}
