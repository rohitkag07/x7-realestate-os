import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent } from '@/lib/colony-server';
const schema = z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']), note: z.string().optional(), by_name: z.string().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
  const result = await callColonyAgent<{ ok: boolean }>('/ticket/update', { complaint_id: id, ...parsed.data, by_role: 'secretary' });
  if (!result) return NextResponse.json({ ok: false, error: 'colony agent unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
