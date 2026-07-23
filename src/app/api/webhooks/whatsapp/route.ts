import crypto from 'node:crypto';
import { after, NextResponse } from 'next/server';
import {
  ingestWhatsAppWebhook,
  processStoredWhatsAppMessages,
} from '@/lib/whatsapp-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
  if (!verifyToken) {
    return NextResponse.json(
      { ok: false, error: 'Webhook verification is not configured.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token') || '';
  const challenge = searchParams.get('hub.challenge') || '';
  if (
    mode === 'subscribe'
    && safeEqual(token, verifyToken)
    && challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json(
    { ok: false, error: 'Webhook verification failed.' },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET || '';
  if (!appSecret) {
    return NextResponse.json(
      { ok: false, error: 'Meta signature verification is not configured.' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (!validateMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid Meta signature.' },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  let ingest: Awaited<ReturnType<typeof ingestWhatsAppWebhook>>;
  try {
    ingest = await ingestWhatsAppWebhook(
      payload as Parameters<typeof ingestWhatsAppWebhook>[0],
    );
  } catch (error) {
    console.error(
      'whatsapp_webhook_ingest_failed',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: 'Webhook persistence failed.' },
      { status: 500 },
    );
  }

  after(() => processStoredWhatsAppMessages(ingest.pendingResponses));

  return NextResponse.json({
    ok: true,
    accepted: ingest.messages,
    statuses: ingest.statuses,
  });
}

function validateMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`;
  return safeEqual(signature, expected);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
