import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callGhostCloser } from '@/lib/marketing-server';

const schema = z.object({ builder_id: z.string().optional(), batch_size: z.number().int().positive().max(200).optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const payload = parsed.success ? parsed.data : {};
  const result = await callGhostCloser<{ ok: boolean; sent: number; skipped: number; failed: number }>('/cron/hunt', { batch_size: 25, ...payload });
  if (!result) return NextResponse.json({ ok: false, error: 'ghost-closer unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
