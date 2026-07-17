import { NextResponse } from 'next/server';
import { ingestExternalLead } from '@/lib/external-lead-ingest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.JUSTDIAL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'justdial_webhook_not_configured' }, { status: 503 });
  if (request.headers.get('x-justdial-secret') !== secret) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';
  const fields = contentType.includes('application/json')
    ? await request.json().catch(() => ({})) as Record<string, string>
    : Object.fromEntries((await request.formData()).entries()) as Record<string, string>;
  try {
    const result = await ingestExternalLead({
      source: 'justdial', name: fields.name || fields.Name || fields.customer_name,
      phone: fields.phone || fields.mobile || fields.Mobile || fields.contact_number || '',
      message: fields.message || fields.requirement || fields.enquiry,
      city: fields.city || fields.City, category: fields.category || fields.service,
      raw: fields,
    });
    return NextResponse.json({ ok: true, contact_id: result.contact.id, thread_id: result.thread.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'ingest_failed' }, { status: 400 });
  }
}
