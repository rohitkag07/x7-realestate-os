import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent } from '@/lib/colony-server';
const schema = z.object({ project_id: z.string().optional(), month: z.string().optional(), dry_run: z.boolean().optional() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const p = parsed.success ? parsed.data : {};
  const result = await callColonyAgent<{ ok: boolean; sent: number; failed: number }>('/billing/generate', { projectId: p.project_id, month: p.month, dryRun: p.dry_run });
  if (!result) return NextResponse.json({ ok: false, error: 'colony agent unreachable' }, { status: 502 });
  return NextResponse.json(result);
}
