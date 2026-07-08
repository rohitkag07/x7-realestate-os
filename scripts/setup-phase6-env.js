const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ENV_FILES = [
  'apps/dashboard/.env.local',
  'apps/landing/.env.local',
  'agents/x7-re-summoner/.env',
  'agents/x7-re-sales-agent/.env',
  'agents/x7-re-content-agent/.env',
  'agents/x7-re-ads-agent/.env',
  'agents/x7-re-ghost-closer/.env',
  'agents/x7-re-colony-agent/.env',
  'agents/x7-re-finance-agent/.env',
  'agents/x7-re-tool-gateway/.env'
];

const promptUser = (question) => new Promise((resolve) => rl.question(question, resolve));

function upsertEnvValue(content, key, value) {
  if (value === undefined || value === null || value === '') return content;
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${suffix}${line}\n`;
}

function mask(value) {
  if (!value) return 'not set';
  if (value.length <= 10) return 'set';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function main() {
  console.log('\n=============================================');
  console.log('Automating Phase 6 Env Setup & Handoff');
  console.log('=============================================\n');

  const supabaseUrl = await promptUser('Enter new SUPABASE_URL: ');
  const supabaseAnonKey = await promptUser('Enter new NEXT_PUBLIC_SUPABASE_ANON_KEY: ');
  const supabaseServiceKey = await promptUser('Enter new SUPABASE_SERVICE_ROLE_KEY: ');
  const databaseUrl = await promptUser('Enter DATABASE_URL for migrations (optional, press Enter to skip): ');
  const whatsappToken = await promptUser('Enter new WHATSAPP_ACCESS_TOKEN: ');
  const whatsappPhoneId = await promptUser('Enter new WHATSAPP_PHONE_NUMBER_ID (optional, press Enter to skip): ');
  const metaAppSecret = await promptUser('Enter new META_APP_SECRET (optional, press Enter to skip): ');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !whatsappToken) {
    console.error('\nError: Missing required credentials. Aborting.');
    process.exit(1);
  }

  try {
    new URL(supabaseUrl);
  } catch {
    console.error('\nError: SUPABASE_URL is not a valid URL. Aborting.');
    process.exit(1);
  }

  let updatedCount = 0;

  for (const relPath of ENV_FILES) {
    const fullPath = path.join(__dirname, '..', relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    let content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';

    content = upsertEnvValue(content, 'SUPABASE_URL', supabaseUrl);
    content = upsertEnvValue(content, 'NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);
    content = upsertEnvValue(content, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey);
    content = upsertEnvValue(content, 'SUPABASE_ANON_KEY', supabaseAnonKey);
    content = upsertEnvValue(content, 'SUPABASE_SERVICE_ROLE_KEY', supabaseServiceKey);
    content = upsertEnvValue(content, 'DATABASE_URL', databaseUrl);

    content = upsertEnvValue(content, 'WHATSAPP_ACCESS_TOKEN', whatsappToken);
    content = upsertEnvValue(content, 'WHATSAPP_TOKEN', whatsappToken);
    content = upsertEnvValue(content, 'WHATSAPP_PHONE_NUMBER_ID', whatsappPhoneId);
    content = upsertEnvValue(content, 'WHATSAPP_PHONE_ID', whatsappPhoneId);
    content = upsertEnvValue(content, 'META_APP_SECRET', metaAppSecret);

    fs.writeFileSync(fullPath, content, 'utf8');
    updatedCount++;
    console.log(`Updated: ${relPath}`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} environment files.`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Anon key: ${mask(supabaseAnonKey)}`);
  console.log(`Service key: ${mask(supabaseServiceKey)}`);
  console.log(`Database URL: ${mask(databaseUrl)}`);
  console.log(`WhatsApp token: ${mask(whatsappToken)}`);
  console.log('\nNext steps to automate Phase 6 proof:');
  console.log('1. If DATABASE_URL was provided, run migrations with `psql "$DATABASE_URL" -f supabase/migrations/009_generic_core_layer.sql` and repeat for 010/011.');
  console.log('2. Run `./scripts/start-phase6-local.sh` to boot the agent mesh.');
  console.log('3. Simulate inbound webhook to Summoner to verify DB persistence and routing.\n');
  
  rl.close();
}

main();
