import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/colony-server';

const schema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().nullable().optional(),
  alt_phone: z.string().nullable().optional(),
  status: z.enum(['owner', 'tenant', 'vacant', 'co_owner']).default('owner'),
  move_in_date: z.string().nullable().optional(),
  move_out_date: z.string().nullable().optional(),
  emergency_contact: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid resident payload' }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const payload = parsed.data;
  const { data, error } = await (supabase.from('residents') as any)
    .insert({
      project_id: payload.project_id,
      name: payload.name,
      phone: payload.phone,
      email: payload.email ?? null,
      alt_phone: payload.alt_phone ?? null,
      status: payload.status,
      move_in_date: payload.move_in_date ?? null,
      move_out_date: payload.move_out_date ?? null,
      family_members: [],
      vehicles: [],
      emergency_contact: payload.emergency_contact ?? {},
      documents: [],
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resident: data }, { status: 201 });
}
