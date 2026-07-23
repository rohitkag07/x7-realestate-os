import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const env = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
      && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
    ),
    metaSecret: Boolean(process.env.META_APP_SECRET),
    verifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    accessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN),
    phoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    salesEnabled: process.env.DYNAMIC_KEYWORD_ENGINE_ENABLED !== 'false',
  };

  let database = false;
  let databaseError: string | null = null;
  if (env.supabase) {
    try {
      const result = await createServiceClient()
        .from('conversation_threads')
        .select('id', { head: true, count: 'exact' });
      database = !result.error;
      databaseError = result.error?.message ?? null;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Supabase check failed.';
    }
  }

  const checks = {
    summoner: {
      ok: database && env.metaSecret && env.verifyToken,
      status: database && env.metaSecret && env.verifyToken ? 'online' : 'offline',
      runtime: 'vercel-webhook',
    },
    sales: {
      ok: database && env.salesEnabled,
      status: database && env.salesEnabled ? 'online' : 'offline',
      runtime: 'vercel-function',
    },
    'tool-gateway': {
      ok: env.accessToken && env.phoneNumberId,
      status: env.accessToken && env.phoneNumberId ? 'online' : 'offline',
      runtime: 'vercel-meta-client',
    },
  };

  return NextResponse.json({
    ok: Object.values(checks).every((check) => check.ok),
    mode: 'vercel-serverless',
    checks,
    database: { ok: database, error: databaseError },
  });
}
