import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';

const appointmentUpdate = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  scheduled_at: z.string().datetime().optional(),
}).refine((value) => value.status || value.scheduled_at, 'At least one appointment field is required.');

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = serviceClientOrNull();
  if (!client) return NextResponse.json({ error: 'Supabase service credentials are not configured.' }, { status: 503 });
  const parsed = appointmentUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid appointment update.' }, { status: 400 });
  const { id } = await params;
  const { data, error } = await (client.from('appointments') as any).update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', id).select('id,thread_id,contact_id,title,appointment_type,scheduled_at,status,notes').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, appointment: data });
}
