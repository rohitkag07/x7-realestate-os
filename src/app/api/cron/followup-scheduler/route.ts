import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { processDueFollowups } from '@/lib/followup-scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  return runScheduler(request);
}

export async function POST(request: Request) {
  return runScheduler(request);
}

async function runScheduler(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'Scheduler authentication is not configured.' },
      { status: 503 },
    );
  }
  const authorization = request.headers.get('authorization') || '';
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await processDueFollowups();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(
      'followup_scheduler_failed',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: 'Follow-up scheduler failed.' },
      { status: 500 },
    );
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
