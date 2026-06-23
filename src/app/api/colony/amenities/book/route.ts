import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callColonyAgent } from '@/lib/colony-server';

const schema = z.object({
  amenity_id: z.string().min(1),
  resident_id: z.string().min(1),
  date: z.string().min(10),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
  guests: z.number().int().positive().max(200).default(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid amenity booking payload' }, { status: 400 });
  }

  const result = await callColonyAgent<{
    ok: boolean;
    booking: { id: string };
    upi_link?: string | null;
    fee?: number;
  }>('/amenity/book', parsed.data);

  if (!result) {
    return NextResponse.json({ ok: false, error: 'colony agent unreachable' }, { status: 502 });
  }

  return NextResponse.json(result, { status: 201 });
}
