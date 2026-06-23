import { NextResponse } from 'next/server';
import { callContentAgent } from '@/lib/content-server';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const agentResponse = await callContentAgent<{ ok: boolean; score: number; decision: string }>('/score', {
    content_id: params.id,
  });
  if (!agentResponse) {
    return NextResponse.json({ ok: false, error: 'content agent unreachable' }, { status: 502 });
  }
  return NextResponse.json(agentResponse);
}
