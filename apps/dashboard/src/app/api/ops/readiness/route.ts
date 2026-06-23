import { NextResponse } from 'next/server';
import { getOpsReadiness } from '@/lib/ops-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = await getOpsReadiness();
  return NextResponse.json(readiness);
}
