import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const questionSchema = z.object({
  key: z.string().min(1),
  question: z.string().min(1),
  type: z.enum(['text', 'choice', 'yes_no']),
  choices: z.array(z.string()).optional(),
  required: z.boolean(),
  order: z.number(),
});

const schema = z.object({
  business_id: z.string().uuid().optional(),
  name: z.string().min(1),
  vertical: z.enum(['real_estate', 'clinic', 'coaching', 'gym', 'local_service']),
  system_prompt: z.string().optional(),
  qualification_questions: z.array(questionSchema).min(1),
  handoff_rules: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid playbook payload' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const payload = parsed.data;
  const businessId = payload.business_id ?? await firstBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ ok: false, error: 'no business found for playbook save' }, { status: 400 });
  }

  const existing = await (supabase.from('assistant_playbooks') as any)
    .select('id')
    .eq('business_id', businessId)
    .eq('vertical', payload.vertical)
    .maybeSingle();

  const row = {
    business_id: businessId,
    name: payload.name,
    vertical: payload.vertical,
    system_prompt: payload.system_prompt ?? null,
    qualification_questions: payload.qualification_questions,
    handoff_rules: payload.handoff_rules,
    is_active: true,
  };

  const query = existing.data?.id
    ? (supabase.from('assistant_playbooks') as any).update(row).eq('id', existing.data.id)
    : (supabase.from('assistant_playbooks') as any).insert(row);

  const { data, error } = await query.select('*').single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, playbook: data });
}

async function firstBusinessId(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await (supabase.from('businesses') as any)
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
