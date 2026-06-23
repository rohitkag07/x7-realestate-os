import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent, serviceClientOrNull } from '@/lib/colony-server';
const schema = z.object({
  project_id: z.string().min(1), builder_id: z.string().min(1),
  title: z.string().min(1), body: z.string().min(1), body_hindi: z.string().optional(),
  category: z.enum(['general', 'maintenance', 'emergency', 'event', 'poll', 'payment', 'warning']).default('general'),
  target: z.enum(['all', 'owners', 'tenants', 'block', 'floor', 'custom']).default('all'),
  send_now: z.boolean().default(true),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  const { data: notice, error } = await (supabase.from('notices') as any).insert({
    project_id: p.project_id, builder_id: p.builder_id, title: p.title, body: p.body, body_hindi: p.body_hindi ?? null,
    category: p.category, target: p.target, status: p.send_now ? 'scheduled' : 'draft',
  }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!p.send_now) return NextResponse.json({ ok: true, notice }, { status: 201 });
  const broadcast = await callColonyAgent('/notice/broadcast', { notice_id: notice.id });
  return NextResponse.json({ ok: true, notice, broadcast }, { status: broadcast ? 201 : 207 });
}
