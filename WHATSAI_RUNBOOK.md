# WhatsAI Serverless Runbook

Canonical repo:

```bash
cd /Users/rohit/Projects/saas-products/whatsai-assistant
```

## 1. Runtime Architecture

Production uses one Vercel Next.js deployment:

- `/api/webhooks/whatsapp` receives Meta webhooks.
- `src/lib/sales-agent-engine.ts` loads the tenant playbook and knowledge.
- `src/lib/whatsapp-cloud-api.ts` sends directly through Meta Cloud API.
- `/api/cron/followup-scheduler` processes due follow-ups.
- Supabase Cron calls the secured scheduler route every five minutes.

PM2, Cloud Run, ngrok, and the Mac are not required for production.

## 2. Environment

Copy `.env.example` to `.env.local` for local development. Add the same secret
values to the Vercel Production environment.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `CRON_SECRET`
- `DYNAMIC_KEYWORD_ENGINE_ENABLED=true`
- `KNOWLEDGE_BASE_ENABLED=true`

Use a permanent Meta system-user token for `WHATSAPP_ACCESS_TOKEN`. Never commit
tokens, app secrets, service-role keys, or `CRON_SECRET`.

## 3. Database

Apply migrations through:

```text
supabase/migrations/019_vercel_serverless_runtime.sql
```

Migration 019 adds:

- atomic tenant/channel/contact/thread/message webhook ingest
- duplicate webhook protection
- `pg_cron` and `pg_net`
- a five-minute scheduler trigger

After production deployment, store the endpoint and `CRON_SECRET` in Supabase
Vault using the same values configured in Vercel:

```sql
select vault.create_secret(
  'https://x7-whatsai-dashboard.vercel.app/api/cron/followup-scheduler',
  'whatsai_followup_cron_url'
);

select vault.create_secret(
  'REPLACE_WITH_THE_VERCEL_CRON_SECRET',
  'whatsai_followup_cron_secret'
);
```

If those names already exist, update the existing Vault secrets instead of
creating duplicates.

## 4. Local Development

```bash
npm install
npm run dev
```

Dashboard:

```text
http://localhost:3000
```

Webhook:

```text
http://localhost:3000/api/webhooks/whatsapp
```

## 5. Verification

Type and build gates:

```bash
npm run type-check
npm run test:keyword-engine
npm run build
```

With the dashboard running:

```bash
npm run prove:whatsai
```

To prove production:

```bash
WHATSAI_APP_URL=https://x7-whatsai-dashboard.vercel.app npm run prove:whatsai
```

The proof checks env, serverless health, webhook verification, cron
authentication, and canonical Supabase tables.

## 6. Meta Webhook

Set this callback in Meta Developer Console:

```text
https://x7-whatsai-dashboard.vercel.app/api/webhooks/whatsapp
```

Use the exact `WHATSAPP_VERIFY_TOKEN` stored in Vercel.

Subscribe to the `messages` webhook field. The POST route rejects unsigned
requests and returns `500` if canonical persistence fails, allowing Meta retries.

## 7. Data Proof

Send a WhatsApp message and verify:

1. `whatsapp_messages` contains the inbound audit row.
2. `conversation_contacts` contains the tenant-scoped contact.
3. `conversation_threads` contains the channel/contact thread.
4. `conversation_messages` contains inbound and outbound rows.
5. unmatched messages create `handoff_events`.
6. first automated replies can create `followup_jobs`.

The dashboard `/chats` route should display the same canonical thread.

## 8. Operational Controls

Pause automation by changing a thread to manual/human takeover in the dashboard.
The embedded sales engine checks this before sending.

Controlled global rollback:

```env
DYNAMIC_KEYWORD_ENGINE_ENABLED=false
```

Redeploy Vercel after changing the flag.

## 9. Cost Guard

This architecture has no always-on compute. Vercel functions execute only for
requests, and Supabase triggers the scheduler. Stay within each provider's free
tier and monitor usage; ₹0 is a target, not a contractual guarantee from Meta,
Vercel, or Supabase.

Razorpay, content generation, colony, finance, OpenAI, and Cloud Run are not
launch blockers for the WhatsAI lead-to-appointment runtime.
