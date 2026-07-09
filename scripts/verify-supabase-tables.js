#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_TABLES = [
  'businesses',
  'business_profiles',
  'business_channels',
  'assistant_playbooks',
  'conversation_contacts',
  'conversation_threads',
  'conversation_messages',
  'lead_qualification_answers',
  'handoff_events',
  'subscription_plans',
  'business_subscriptions',
  'business_usage',
  'business_setup_checklist',
  'subscription_invoices',
];

const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, 'agents/x7-re-summoner/.env');
const proofLogPath = path.join(repoRoot, '.docs/ghost-ai/PROOF_LOG.md');

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function requireEnv(env, key) {
  const value = env[key] || process.env[key] || '';
  if (!value) {
    throw new Error(`${key} missing in ${path.relative(repoRoot, envPath)}`);
  }
  return value;
}

async function verifyTable({ supabaseUrl, serviceRoleKey, table }) {
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  if (response.ok) {
    return { table, ok: true, status: response.status };
  }

  let error = text;
  try {
    const parsed = JSON.parse(text);
    error = parsed.message || parsed.hint || parsed.code || text;
  } catch {
    // Keep raw response text.
  }

  return { table, ok: false, status: response.status, error };
}

function appendProofLog(results) {
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const timestamp = new Date().toISOString();
  const lines = [
    '',
    '## Step 2: Supabase Tables',
    `- Timestamp: ${timestamp}`,
    `- Result: ${passed}/${results.length} tables verified${failed === 0 ? ' ✅' : ' ❌'}`,
    `- Env source: \`${path.relative(repoRoot, envPath)}\``,
    '- Table checks:',
    ...results.map((result) => (
      `  - ${result.ok ? '✅' : '❌'} ${result.table} - ${result.ok ? 'EXISTS' : `MISSING (${result.status}${result.error ? `: ${String(result.error).replace(/\s+/g, ' ').slice(0, 180)}` : ''})`}`
    )),
  ];

  fs.mkdirSync(path.dirname(proofLogPath), { recursive: true });
  fs.appendFileSync(proofLogPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file not found: ${path.relative(repoRoot, envPath)}`);
  }

  const env = parseEnvFile(envPath);
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
  const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  const results = [];
  for (const table of REQUIRED_TABLES) {
    const result = await verifyTable({ supabaseUrl, serviceRoleKey, table });
    results.push(result);
    if (result.ok) {
      console.log(`✅ ${table} - EXISTS`);
    } else {
      console.log(`❌ ${table} - MISSING (${result.status}${result.error ? `: ${result.error}` : ''})`);
    }
  }

  const passed = results.filter((result) => result.ok).length;
  console.log(`Result: ${passed}/${REQUIRED_TABLES.length} tables verified ${passed === REQUIRED_TABLES.length ? '✅' : '❌'}`);
  appendProofLog(results);

  if (passed !== REQUIRED_TABLES.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`❌ Supabase table verification failed: ${error.message}`);
  fs.mkdirSync(path.dirname(proofLogPath), { recursive: true });
  fs.appendFileSync(
    proofLogPath,
    [
      '',
      '## Step 2: Supabase Tables',
      `- Timestamp: ${new Date().toISOString()}`,
      '- Result: FAIL',
      `- Error: ${error.message}`,
      '',
    ].join('\n'),
    'utf8',
  );
  process.exitCode = 1;
});
