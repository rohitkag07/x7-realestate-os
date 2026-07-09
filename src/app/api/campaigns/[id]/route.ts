import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAdsAgent } from '@/lib/marketing-server';

const schema = z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
  const result = await callAdsAgent<{ ok: boolean }>('/campaign/status', { campaign_id: id, status: parsed.data.status });
  if (!result) return NextResponse.json({ ok: false, error: 'ads agent unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
