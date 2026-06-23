import { NextResponse } from 'next/server';
import { getSummonerHealth } from '@/lib/summoner-server';

export async function GET() {
  const health = await getSummonerHealth<Record<string, unknown>>();
  if (!health) {
    return NextResponse.json({ ok: false, error: 'summoner unreachable' }, { status: 502 });
  }

  return NextResponse.json(health);
}
