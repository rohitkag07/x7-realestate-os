#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const summonerEnvPath = path.join(repoRoot, 'agents/x7-re-summoner/.env');
const salesAgentEnvPath = path.join(repoRoot, 'agents/x7-re-sales-agent/.env');
const proofLogPath = path.join(repoRoot, '.docs/ghost-ai/PROOF_LOG.md');
const playbookPath = path.join(repoRoot, 'agents/x7-re-sales-agent/vertical-playbooks.js');

const BUSINESS_NAME = 'WhatsAI Test Coaching Center';
const OWNER_PHONE = '+919876543210';
const OWNER_NAME = 'Rohit Kag';
const WHATSAPP_NUMBER = '+919876543210';

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
  if (!value) throw new Error(`${key} missing in ${path.relative(repoRoot, summonerEnvPath)}`);
  return value;
}

function updateEnvValue(filePath, key, value) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  let found = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    if (nextLines.length && nextLines[nextLines.length - 1] !== '') nextLines.push('');
    nextLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, nextLines.join('\n').replace(/\n{3,}$/g, '\n\n'), 'utf8');
}

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value, (_key, innerValue) => (
    typeof innerValue === 'function' ? undefined : innerValue
  )));
}

class SupabaseRest {
  constructor({ url, serviceRoleKey }) {
    this.url = url.replace(/\/$/, '');
    this.serviceRoleKey = serviceRoleKey;
  }

  async request(pathname, { method = 'GET', body, prefer, searchParams } = {}) {
    const url = new URL(`${this.url}/rest/v1/${pathname}`);
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value != null) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message = data?.message || data?.hint || data?.code || response.statusText;
      throw new Error(`${method} ${pathname} failed (${response.status}): ${message}`);
    }

    return data;
  }

  select(table, params) {
    return this.request(table, { searchParams: params });
  }

  insert(table, row) {
    return this.request(table, {
      method: 'POST',
      body: row,
      prefer: 'return=representation',
    });
  }

  update(table, row, params) {
    return this.request(table, {
      method: 'PATCH',
      body: row,
      prefer: 'return=representation',
      searchParams: params,
    });
  }

  upsert(table, row, onConflict) {
    return this.request(table, {
      method: 'POST',
      body: row,
      prefer: 'resolution=merge-duplicates,return=representation',
      searchParams: { on_conflict: onConflict },
    });
  }

  rpc(fnName, body) {
    return this.request(`rpc/${fnName}`, {
      method: 'POST',
      body,
    });
  }
}

async function loadCoachingPlaybook() {
  const module = await import(pathToFileURL(playbookPath).href);
  const playbook = module.getPlaybook?.('coaching') || module.PLAYBOOKS?.coaching;
  if (!playbook) throw new Error('coaching playbook not found in vertical-playbooks.js');
  return cleanJson(playbook);
}

async function ensureBusiness(api) {
  const existing = await api.select('businesses', {
    select: 'id,name,phone,status,plan',
    name: `eq.${BUSINESS_NAME}`,
    order: 'created_at.desc',
    limit: '1',
  });

  if (existing?.[0]?.id) {
    const [updated] = await api.update('businesses', {
      phone: OWNER_PHONE,
      status: 'active',
      plan: 'trial',
    }, { id: `eq.${existing[0].id}` });
    return { row: updated || existing[0], action: 'updated' };
  }

  const [created] = await api.insert('businesses', {
    name: BUSINESS_NAME,
    phone: OWNER_PHONE,
    email: 'trial@xeroseven.in',
    status: 'active',
    plan: 'trial',
  });

  return { row: created, action: 'inserted' };
}

async function ensureTrialPlan(api) {
  const existing = await api.select('subscription_plans', {
    select: 'id,key,name,limits',
    key: 'eq.trial',
    limit: '1',
  });

  if (existing?.[0]?.id) return { row: existing[0], action: 'existing' };

  const [created] = await api.insert('subscription_plans', {
    key: 'trial',
    name: 'Trial',
    price_inr: 0,
    setup_fee_inr: 0,
    features: ['7-day WhatsApp AI receptionist', '1 vertical playbook', 'Daily hot-lead summary', 'Operator dashboard'],
    limits: { messages_per_day: 500, contacts: 100, verticals: 1 },
    is_active: true,
    sort_order: 0,
  });

  return { row: created, action: 'inserted' };
}

async function ensurePlaybook(api, businessId, coachingPlaybook) {
  const existing = await api.select('assistant_playbooks', {
    select: 'id',
    business_id: `eq.${businessId}`,
    vertical: 'eq.coaching',
    limit: '1',
  });

  const row = {
    business_id: businessId,
    name: coachingPlaybook.name || 'WhatsAI Admission',
    vertical: 'coaching',
    system_prompt: coachingPlaybook.system_prompt,
    qualification_questions: coachingPlaybook.qualification_questions,
    handoff_rules: coachingPlaybook.handoff_rules,
    is_active: true,
  };

  if (existing?.[0]?.id) {
    const [updated] = await api.update('assistant_playbooks', row, { id: `eq.${existing[0].id}` });
    return { row: updated || { id: existing[0].id, ...row }, action: 'updated' };
  }

  const [created] = await api.insert('assistant_playbooks', row);
  return { row: created, action: 'inserted' };
}

function appendProofLog(summary) {
  const lines = [
    '',
    '## Step 3: Trial Business Seed',
    `- Timestamp: ${new Date().toISOString()}`,
    `- business_id: ${summary.businessId}`,
    '- Tables inserted/updated:',
    `  - businesses: ${summary.actions.businesses}`,
    `  - business_profiles: ${summary.actions.business_profiles}`,
    `  - business_channels: ${summary.actions.business_channels}`,
    `  - subscription_plans: ${summary.actions.subscription_plans}`,
    `  - business_subscriptions: ${summary.actions.business_subscriptions}`,
    `  - assistant_playbooks: ${summary.actions.assistant_playbooks}`,
    `- checklist seeded confirmation: ${summary.checklistCount} rows`,
    '- Env updated:',
    '  - `agents/x7-re-summoner/.env` DEFAULT_BUSINESS_ID',
    '  - `agents/x7-re-sales-agent/.env` DEFAULT_BUSINESS_ID',
  ];

  fs.mkdirSync(path.dirname(proofLogPath), { recursive: true });
  fs.appendFileSync(proofLogPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  if (!fs.existsSync(summonerEnvPath)) {
    throw new Error(`Env file not found: ${path.relative(repoRoot, summonerEnvPath)}`);
  }

  const env = parseEnvFile(summonerEnvPath);
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
  const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_ID || WHATSAPP_NUMBER.replace(/\D/g, '');
  const api = new SupabaseRest({ url: supabaseUrl, serviceRoleKey });
  const coachingPlaybook = await loadCoachingPlaybook();
  const actions = {};

  const business = await ensureBusiness(api);
  actions.businesses = business.action;
  const businessId = business.row.id;

  const profile = await api.upsert('business_profiles', {
    business_id: businessId,
    vertical: 'coaching',
    company_name: BUSINESS_NAME,
    city: 'Indore',
    timezone: 'Asia/Kolkata',
    metadata: {
      owner_name: OWNER_NAME,
      owner_phone: OWNER_PHONE,
      whatsapp_number: WHATSAPP_NUMBER,
      services: ['JEE Coaching', 'NEET Coaching', 'UPSC Coaching'],
      pricing_range: '₹3,000 - ₹8,000/month',
      faqs: [
        { q: 'Classes kab se start hoti hain?', a: 'Har mahine 1 tarikh se' },
        { q: 'Demo class milega?', a: 'Haan, pehle free demo class available hai' },
      ],
    },
  }, 'business_id');
  actions.business_profiles = profile?.[0]?.id ? 'upserted' : 'upserted';

  const channel = await api.upsert('business_channels', {
    business_id: businessId,
    provider: 'meta_whatsapp',
    channel_id: phoneNumberId,
    channel_phone: WHATSAPP_NUMBER,
    config: {
      channel_type: 'whatsapp',
      channel_identifier: WHATSAPP_NUMBER,
      phone_number_id: phoneNumberId,
      owner_phone: OWNER_PHONE,
    },
    is_active: true,
  }, 'provider,channel_id');
  actions.business_channels = channel?.[0]?.id ? 'upserted' : 'upserted';

  const trialPlan = await ensureTrialPlan(api);
  actions.subscription_plans = trialPlan.action;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const subscription = await api.upsert('business_subscriptions', {
    business_id: businessId,
    plan_id: trialPlan.row.id,
    status: 'trialing',
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_end: trialEnd.toISOString(),
  }, 'business_id');
  actions.business_subscriptions = subscription?.[0]?.id ? 'upserted' : 'upserted';

  const playbook = await ensurePlaybook(api, businessId, coachingPlaybook);
  actions.assistant_playbooks = playbook.action;

  await api.rpc('seed_setup_checklist', { p_business_id: businessId });
  const checklist = await api.select('business_setup_checklist', {
    select: 'id',
    business_id: `eq.${businessId}`,
  });

  updateEnvValue(summonerEnvPath, 'DEFAULT_BUSINESS_ID', businessId);
  updateEnvValue(salesAgentEnvPath, 'DEFAULT_BUSINESS_ID', businessId);

  appendProofLog({
    businessId,
    actions,
    checklistCount: checklist?.length ?? 0,
  });

  console.log(`business_id=${businessId}`);
  console.log('tables inserted/updated:');
  for (const [table, action] of Object.entries(actions)) {
    console.log(`- ${table}: ${action}`);
  }
  console.log(`checklist_seeded=${(checklist?.length ?? 0) > 0} (${checklist?.length ?? 0} rows)`);
  console.log('env_updated=agents/x7-re-summoner/.env, agents/x7-re-sales-agent/.env');
}

main().catch((error) => {
  console.error(`❌ Trial business seed failed: ${error.message}`);
  fs.mkdirSync(path.dirname(proofLogPath), { recursive: true });
  fs.appendFileSync(
    proofLogPath,
    [
      '',
      '## Step 3: Trial Business Seed',
      `- Timestamp: ${new Date().toISOString()}`,
      '- Result: FAIL',
      `- Error: ${error.message}`,
      '',
    ].join('\n'),
    'utf8',
  );
  process.exitCode = 1;
});
