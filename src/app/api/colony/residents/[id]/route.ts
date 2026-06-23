import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/colony-server';

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().nullable().optional(),
  alt_phone: z.string().nullable().optional(),
  status: z.enum(['owner', 'tenant', 'vacant', 'co_owner']).optional(),
  move_in_date: z.string().nullable().optional(),
  move_out_date: z.string().nullable().optional(),
  emergency_contact: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid resident patch' }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const patch = Object.fromEntries(
    Object.entries({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email ?? null } : {}),
      ...(parsed.data.alt_phone !== undefined ? { alt_phone: parsed.data.alt_phone ?? null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.move_in_date !== undefined ? { move_in_date: parsed.data.move_in_date ?? null } : {}),
      ...(parsed.data.move_out_date !== undefined ? { move_out_date: parsed.data.move_out_date ?? null } : {}),
      ...(parsed.data.emergency_contact !== undefined ? { emergency_contact: parsed.data.emergency_contact } : {}),
    }),
  );

  const { data, error } = await (supabase.from('residents') as any)
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resident: data });
}
