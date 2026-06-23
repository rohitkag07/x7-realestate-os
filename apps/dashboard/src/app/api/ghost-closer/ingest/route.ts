import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callGhostCloser } from '@/lib/marketing-server';

const schema = z.object({
  builder_id: z.string().min(1),
  project_id: z.string().optional(),
  source: z.string().optional(),
  prospects: z.array(z.object({
    full_name: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    city: z.string().optional(),
    occupation: z.string().optional(),
    is_nri: z.boolean().optional(),
  })).min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const result = await callGhostCloser<{ ok: boolean; inserted: number; skipped: number }>('/prospects/ingest', parsed.data);
  if (!result) return NextResponse.json({ ok: false, error: 'ghost-closer unreachable' }, { status: 502 });
  return NextResponse.json(result, { status: 201 });
}
