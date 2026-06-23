import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callContentAgent, fallbackCalendarSummary, logAgentRun } from '@/lib/content-server';

const schema = z.object({
  builder_id: z.string().min(1),
  project_id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const payload = parsed.data;
  const agentResponse = await callContentAgent<{ ok: boolean; count: number; content_ids: string[]; source: string }>(
    '/calendar/generate',
    payload,
  );
  const result = agentResponse ?? fallbackCalendarSummary(payload.month);

  await logAgentRun({
    builderId: payload.builder_id,
    projectId: payload.project_id,
    action: 'calendar.generate',
    input: { month: payload.month ?? null },
    output: result as Record<string, unknown>,
    status: agentResponse ? 'success' : 'partial',
  });

  return NextResponse.json(result);
}
