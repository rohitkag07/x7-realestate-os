#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const env = {
  ...loadEnvFile(path.join(root, '.env.local')),
  ...process.env,
};
const appUrl = String(
  env.WHATSAI_APP_URL
  || env.NEXT_PUBLIC_APP_URL
  || 'http://localhost:3000',
).replace(/\/$/, '');
const checks = [];

main().catch((error) => {
  record({
    ok: false,
    label: 'Unexpected proof runner failure',
    detail: error.message || String(error),
    fix: 'Fix the runtime error, then rerun npm run prove:whatsai.',
  });
  finish();
});

async function main() {
  checkEnv('NEXT_PUBLIC_SUPABASE_URL', 'Add NEXT_PUBLIC_SUPABASE_URL to .env.local or Vercel.');
  checkEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    'Add the Supabase service-role key to .env.local or Vercel; never expose it as NEXT_PUBLIC_.',
    ['SUPABASE_SECRET_KEY'],
  );
  checkEnv(
    'WHATSAPP_ACCESS_TOKEN',
    'Add a permanent Meta system-user WhatsApp token to Vercel.',
    ['WHATSAPP_TOKEN'],
  );
  checkEnv('WHATSAPP_PHONE_NUMBER_ID', 'Add the Meta WhatsApp Phone Number ID to Vercel.');
  checkEnv('WHATSAPP_VERIFY_TOKEN', 'Set the same verify token in Vercel and Meta webhook settings.');
  checkEnv('META_APP_SECRET', 'Add the Meta app secret so webhook signatures are validated.');
  checkEnv('CRON_SECRET', 'Generate a long CRON_SECRET and configure the same value in Supabase Vault.');

  await checkServerlessHealth();
  await checkWebhookVerify();
  await checkCronAuth();
  await checkSupabase();
  finish();
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsAt = line.indexOf('=');
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function checkEnv(name, fix, aliases = []) {
  const present = [name, ...aliases].some((key) => Boolean(env[key]));
  record({
    ok: present,
    label: `Env ${name}`,
    detail: present ? 'present' : 'missing',
    fix,
  });
}

async function checkServerlessHealth() {
  const result = await fetchJson(`${appUrl}/api/agent-mesh/health`);
  const payload = result.json || {};
  record({
    ok: result.status === 200 && payload.mode === 'vercel-serverless' && payload.ok === true,
    label: 'Vercel serverless runtime',
    detail: result.status === 200
      ? `HTTP 200, mode=${payload.mode || 'unknown'}, healthy=${Boolean(payload.ok)}`
      : result.error || `HTTP ${result.status}`,
    fix: `Start the dashboard or set WHATSAI_APP_URL to the live deployment, then check ${appUrl}/api/agent-mesh/health.`,
  });
}

async function checkWebhookVerify() {
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    record({
      ok: false,
      label: 'Webhook GET verify',
      detail: 'skipped because WHATSAPP_VERIFY_TOKEN is missing',
      fix: 'Set WHATSAPP_VERIFY_TOKEN in .env.local or Vercel.',
    });
    return;
  }
  const challenge = `prove-whatsai-${Date.now()}`;
  const url = new URL(`${appUrl}/api/webhooks/whatsapp`);
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', verifyToken);
  url.searchParams.set('hub.challenge', challenge);
  const result = await fetchText(url.toString());
  record({
    ok: result.status === 200 && result.text.trim() === challenge,
    label: 'Webhook GET verify',
    detail: result.status === 200 && result.text.trim() === challenge
      ? 'HTTP 200 challenge matched'
      : result.error || `HTTP ${result.status}`,
    fix: 'Confirm the deployment has WHATSAPP_VERIFY_TOKEN and the Meta token matches it.',
  });
}

async function checkCronAuth() {
  const result = await fetchJson(`${appUrl}/api/cron/followup-scheduler`);
  record({
    ok: result.status === 401,
    label: 'Follow-up cron authentication',
    detail: result.status === 401
      ? 'unauthenticated request correctly rejected'
      : result.error || `expected HTTP 401, received ${result.status}`,
    fix: 'Ensure CRON_SECRET exists and the cron route rejects requests without its Bearer token.',
  });
}

async function checkSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY
    || env.SUPABASE_SECRET_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    record({
      ok: false,
      label: 'Supabase canonical tables',
      detail: 'missing Supabase URL or key',
      fix: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [threads, channels] = await Promise.all([
      supabase.from('conversation_threads').select('id', { head: true, count: 'exact' }),
      supabase.from('business_channels').select('id', { head: true, count: 'exact' }),
    ]);
    const error = threads.error || channels.error;
    record({
      ok: !error,
      label: 'Supabase canonical tables',
      detail: error ? error.message : 'conversation_threads and business_channels are reachable',
      fix: 'Apply all Supabase migrations through 019_vercel_serverless_runtime.sql.',
    });
  } catch (error) {
    record({
      ok: false,
      label: 'Supabase canonical tables',
      detail: error.message || String(error),
      fix: 'Check the Supabase URL/key and network access.',
    });
  }
}

async function fetchJson(url) {
  const result = await fetchText(url);
  try {
    return { ...result, json: JSON.parse(result.text) };
  } catch {
    return { ...result, json: null };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    return { status: response.status, text: await response.text(), error: null };
  } catch (error) {
    return { status: 0, text: '', error: error.message || String(error) };
  }
}

function record(check) {
  checks.push(check);
  console.log(`${check.ok ? '✅' : '❌'} ${check.label} - ${check.detail}`);
  if (!check.ok) console.log(`   Fix: ${check.fix}`);
}

function finish() {
  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  console.log('');
  console.log(`WhatsAI proof: ${passed}/${checks.length} passed, ${failed} failed.`);
  console.log(failed
    ? 'Result: not ready. Apply the failed fix instructions and rerun.'
    : 'Result: Vercel webhook, embedded sales engine, Meta sender, cron guard, and Supabase are ready.');
  process.exit(failed ? 1 : 0);
}
