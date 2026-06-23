import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent, serviceClientOrNull } from '@/lib/colony-server';

const schema = z.object({
  resident_id: z.string().min(1),
  description: z.string().min(8),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid complaint payload' }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const { data: resident, error: residentError } = await (supabase.from('residents') as any)
    .select('id, project_id, name, phone')
    .eq('id', parsed.data.resident_id)
    .single();

  if (residentError || !resident) {
    return NextResponse.json({ ok: false, error: residentError?.message ?? 'resident not found' }, { status: 404 });
  }

  const result = await callColonyAgent<{ ok: boolean; complaint: { id: string } }>(
    '/ticket/open',
    {
      resident,
      body: parsed.data.description,
      priority: parsed.data.priority,
    },
  );

  if (!result) {
    const { data, error } = await (supabase.from('complaints') as any)
      .insert({
        project_id: resident.project_id,
        resident_id: resident.id,
        category: 'other',
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: 'open',
        attachments: [],
      })
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, complaint: data, mode: 'db-fallback' }, { status: 201 });
  }

  return NextResponse.json(result, { status: 201 });
}
