import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';
import type { AiMode, ConversationStatus } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  thread_id: z.string().min(1),
  ai_mode: z.enum(['assistant', 'manual', 'paused']).optional(),
  status: z.enum(['open', 'pending_human', 'automated', 'resolved', 'archived']).optional(),
  assigned_to: z.string().max(120).optional().nullable(),
  internal_note: z.string().max(2000).optional().nullable(),
  handoff_reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 503 });
  }

  const payload = parsed.data;
  const current = await (supabase.from('conversation_threads') as any)
    .select('id,metadata,ai_mode,status')
    .eq('id', payload.thread_id)
    .maybeSingle();

  if (current.error || !current.data) {
    return NextResponse.json({ ok: false, error: current.error?.message || 'Thread not found.' }, { status: 404 });
  }

  const metadata = {
    ...(isRecord(current.data.metadata) ? current.data.metadata : {}),
    ...(payload.internal_note !== undefined ? { internal_note: payload.internal_note ?? '' } : {}),
    ...(payload.handoff_reason !== undefined ? { handoff_reason: payload.handoff_reason ?? null } : {}),
    state_updated_at: new Date().toISOString(),
  };

  const aiMode = payload.ai_mode ?? current.data.ai_mode as AiMode;
  const status = payload.status ?? statusForAiMode(aiMode, current.data.status as ConversationStatus);

  const update = await (supabase.from('conversation_threads') as any)
    .update({
      ai_mode: aiMode,
      status,
      ...(payload.assigned_to !== undefined ? { assigned_to: payload.assigned_to || null } : {}),
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.thread_id)
    .select()
    .single();

  if (update.error) {
    return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, thread: update.data });
}

function statusForAiMode(aiMode: AiMode, currentStatus: ConversationStatus): ConversationStatus {
  if (aiMode === 'manual' || aiMode === 'paused') return 'pending_human';
  if (currentStatus === 'resolved' || currentStatus === 'archived') return 'open';
  return currentStatus === 'pending_human' ? 'open' : currentStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
