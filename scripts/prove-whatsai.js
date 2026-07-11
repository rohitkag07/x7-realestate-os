#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const env = {
  ...loadEnvFile(path.join(root, '.env.local')),
  ...loadEnvFile(path.join(root, 'apps/dashboard/.env.local')),
  ...loadEnvFile(path.join(root, 'agents/x7-re-sales-agent/.env')),
  ...loadEnvFile(path.join(root, 'agents/x7-re-tool-gateway/.env')),
  ...loadEnvFile(path.join(root, 'agents/x7-re-summoner/.env')),
  ...process.env,
};

const checks = [];

main().catch((error) => {
  fail('Unexpected proof runner failure', error.message || String(error));
  printSummary();
  process.exit(1);
});

async function main() {
  checkEnv('NEXT_PUBLIC_SUPABASE_URL', 'Add NEXT_PUBLIC_SUPABASE_URL to .env.local.');
  checkEnv('WHATSAPP_ACCESS_TOKEN', 'Generate a Meta WhatsApp Cloud API token and add WHATSAPP_ACCESS_TOKEN to agents/x7-re-tool-gateway/.env and Vercel env.');
  checkEnv('WHATSAPP_VERIFY_TOKEN', 'Set WHATSAPP_VERIFY_TOKEN in agents/x7-re-summoner/.env and Meta webhook settings.');

  await checkPm2Agent('x7-sales-agent', 8080);
  await checkPm2Agent('x7-tool-gateway', 8081);
  await checkPm2Agent('x7-summoner', 8082);
  await checkWebhookVerify();
  await checkSupabase();

  printSummary();
  process.exit(checks.some((check) => !check.ok) ? 1 : 0);
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function checkEnv(name, fix) {
  const present = Boolean(env[name]);
  record({
    ok: present,
    label: `Env ${name}`,
    detail: present ? 'present' : 'missing',
    fix,
  });
}

async function checkPm2Agent(name, port) {
  const pm2Online = getPm2Status(name) === 'online';
  record({
    ok: pm2Online,
    label: `PM2 ${name}`,
    detail: pm2Online ? 'online' : 'not online',
    fix: `Run: pm2 start ecosystem.config.cjs --only ${name}`,
  });

  const health = await fetchOk(`http://localhost:${port}/health`);
  record({
    ok: health.ok,
    label: `${name} GET /health:${port}`,
    detail: health.ok ? `HTTP ${health.status}` : health.error || `HTTP ${health.status}`,
    fix: `Check logs: pm2 logs ${name} --lines 100`,
  });
}

function getPm2Status(name) {
  try {
    const output = execFileSync('pm2', ['jlist'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const processes = JSON.parse(output);
    return processes.find((processInfo) => processInfo.name === name)?.pm2_env?.status || 'missing';
  } catch {
    return 'pm2-unavailable';
  }
}

async function checkWebhookVerify() {
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    record({
      ok: false,
      label: 'Webhook GET verify',
      detail: 'skipped because WHATSAPP_VERIFY_TOKEN is missing',
      fix: 'Set WHATSAPP_VERIFY_TOKEN and restart x7-summoner.',
    });
    return;
  }

  const challenge = `prove-whatsai-${Date.now()}`;
  const url = new URL('http://localhost:8082/webhooks/whatsapp');
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', verifyToken);
  url.searchParams.set('hub.challenge', challenge);

  const response = await fetchOk(url.toString(), { expectedBody: challenge });
  record({
    ok: response.ok,
    label: 'Webhook GET verify',
    detail: response.ok ? 'HTTP 200 challenge matched' : response.error || `HTTP ${response.status}`,
    fix: 'Restart Summoner and confirm Meta webhook verify token matches WHATSAPP_VERIFY_TOKEN.',
  });
}

async function checkSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    record({
      ok: false,
      label: 'Supabase conversation_threads',
      detail: 'missing Supabase URL or key',
      fix: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    });
    return;
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
    const { error } = await supabase
      .from('conversation_threads')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    record({
      ok: !error,
      label: 'Supabase conversation_threads',
      detail: error ? error.message : 'reachable and table exists',
      fix: 'Run Supabase migrations and confirm conversation_threads exists in the active project.',
    });
  } catch (error) {
    record({
      ok: false,
      label: 'Supabase conversation_threads',
      detail: error.message || String(error),
      fix: 'Check Supabase URL/key and network access.',
    });
  }
}

async function fetchOk(url, options = {}) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const bodyMatches = options.expectedBody ? text.trim() === options.expectedBody : true;
    return {
      ok: response.status === 200 && bodyMatches,
      status: response.status,
      error: response.status === 200 && !bodyMatches ? 'HTTP 200 but challenge body did not match' : null,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error.message || String(error) };
  }
}

function record(check) {
  checks.push(check);
  const icon = check.ok ? '✅' : '❌';
  console.log(`${icon} ${check.label} - ${check.detail}`);
  if (!check.ok) console.log(`   Fix: ${check.fix}`);
}

function fail(label, detail) {
  record({
    ok: false,
    label,
    detail,
    fix: 'Fix the runtime error shown above, then rerun npm run prove:whatsai.',
  });
}

function printSummary() {
  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  console.log('');
  console.log(`WhatsAI proof: ${passed}/${checks.length} passed, ${failed} failed.`);
  if (failed) {
    console.log('Result: not ready. Apply the failed fix instructions and rerun npm run prove:whatsai.');
  } else {
    console.log('Result: ready. Env, PM2, webhook verify, and Supabase canonical table are healthy.');
  }
}
