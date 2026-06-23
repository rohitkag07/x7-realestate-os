import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent } from '@/lib/colony-server';
const schema = z.object({ approved: z.boolean(), by_name: z.string().optional() });
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'approved boolean required' }, { status: 400 });
  const result = await callColonyAgent<{ ok: boolean }>('/visitor/respond', { visitor_id: params.id, ...parsed.data });
  if (!result) return NextResponse.json({ ok: false, error: 'colony agent unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
