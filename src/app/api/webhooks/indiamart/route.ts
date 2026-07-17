import { NextResponse } from 'next/server';
import { ingestExternalLead } from '@/lib/external-lead-ingest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const key = process.env.INDIAMART_CRM_KEY;
  const payload = await request.json().catch(() => null) as Record<string, string> | null;
  if (!key) return NextResponse.json({ ok: false, error: 'indiamart_webhook_not_configured' }, { status: 503 });
  if (request.headers.get('x-indiamart-key') !== key && payload?.crm_key !== key) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!payload) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  try {
    const result = await ingestExternalLead({
      source: 'indiamart', name: payload.sender_name || payload.name || payload.SENDER_NAME,
      phone: payload.sender_mobile || payload.mobile || payload.phone || payload.SENDER_MOBILE || '',
      message: payload.query_message || payload.message || payload.QUERY_MESSAGE,
      city: payload.sender_city || payload.city || payload.SENDER_CITY,
      category: payload.product_name || payload.category || payload.QUERY_PRODUCT_NAME,
      raw: payload,
    });
    return NextResponse.json({ ok: true, contact_id: result.contact.id, thread_id: result.thread.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'ingest_failed' }, { status: 400 });
  }
}
