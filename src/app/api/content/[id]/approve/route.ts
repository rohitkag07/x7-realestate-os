import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callContentAgent, serviceClientOrNull } from '@/lib/content-server';

const schema = z.object({ scheduled_for: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const scheduled_for = parsed.success ? parsed.data.scheduled_for : undefined;

  const agentResponse = await callContentAgent<{ ok: boolean; content: unknown }>('/approve', {
    content_id: id,
    scheduled_for,
  });
  if (agentResponse) return NextResponse.json(agentResponse);

  // Fallback: direct DB update if agent offline
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'content agent unreachable' }, { status: 502 });
  const patch: Record<string, unknown> = { status: 'scheduled' };
  if (scheduled_for) patch.scheduled_for = scheduled_for;
  const { data, error } = await (supabase.from('content_calendar') as any).update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, content: data });
}
