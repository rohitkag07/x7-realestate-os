import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
  if (!phoneNumberId || !token) return NextResponse.json({ ok: false, configured: false, error: 'WhatsApp credentials are missing.' }, { status: 503 });
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ ok: false, configured: true, error: payload?.error?.message || 'Meta health request failed.' }, { status: 502 });
    return NextResponse.json({ ok: true, configured: true, profile: payload });
  } catch {
    return NextResponse.json({ ok: false, configured: true, error: 'Could not reach Meta WhatsApp API.' }, { status: 502 });
  }
}
