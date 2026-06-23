import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAdsAgent } from '@/lib/marketing-server';

const schema = z.object({ builder_id: z.string().min(1), project_id: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const result = await callAdsAgent<{ ok: boolean; campaigns: unknown[] }>('/campaign/full-funnel', parsed.data);
  if (!result) return NextResponse.json({ ok: false, error: 'ads agent unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
