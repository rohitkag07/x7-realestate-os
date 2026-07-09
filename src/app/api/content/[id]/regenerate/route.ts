import { NextResponse } from 'next/server';
import { callContentAgent } from '@/lib/content-server';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agentResponse = await callContentAgent<{ ok: boolean; media_url: string | null }>('/render', {
    content_id: id,
  });
  if (!agentResponse) {
    return NextResponse.json({ ok: false, error: 'content agent unreachable' }, { status: 502 });
  }
  return NextResponse.json(agentResponse);
}
