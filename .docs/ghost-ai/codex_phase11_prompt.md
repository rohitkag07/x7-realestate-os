# WhatsAI Assistant — Phase 11: End-to-End Live Trial Proof (Codex God Prompt)

## Context

Phase 1 to 10 complete ho chuka hai:
- Dashboard homepage WhatsAI command center hai
- Sidebar restructured hai
- Conversations, Leads, Handoffs, Playbooks, Setup Wizard, Trial Console pages bane hain
- WhatsApp gateway hardened hai
- Public landing page ready hai

**Ab ek hi cheez baaki hai:** Prove karna ki yeh product sirf UI me WhatsApp AI hai ya truly live end-to-end WhatsApp AI receptionist hai.

Is Phase 11 me hum 10 concrete steps execute karenge. **Codex ka role:** automation scripts banao, seed data tayyar karo, health verify karo, aur ek final proof report generate karo. Manual steps (Meta token, ngrok, WhatsApp test message) Rohit khud karega — Codex unke liye setup ready kare.

**Non-negotiable rules:**
1. Koi bhi existing file delete mat karo.
2. Har step ke baad `node --check` ya `npm run type-check` run karo.
3. Agar kuch live nahi ho sakta (expired token etc.), demo fallback proof acceptable hai — clearly mark karo.
4. Har step ka result ek `PROOF_LOG.md` file me append karte jao.

---

## Step 1 — Full Type-check + Build Audit

**Goal:** Confirm karo ki Phase 1-10 ke changes TypeScript errors generate nahi karte.

**Files to check:**
- `apps/dashboard/`
- `apps/landing/`

**Commands to run:**
```bash
cd apps/dashboard && npm run type-check 2>&1 | tee /tmp/dashboard-typecheck.log
cd apps/landing && npm run type-check 2>&1 | tee /tmp/landing-typecheck.log
```

**What Codex should do:**
1. Run type-check on both apps.
2. If errors exist, fix them (missing types, wrong props, unused imports).
3. Common fix patterns:
   - Missing `'use client'` on components using hooks
   - `any` type warnings → add proper interface
   - Missing `key` prop in `.map()` calls
   - Wrong Lucide icon import names
4. After fixes, re-run type-check until both pass clean.
5. Append result to `PROOF_LOG.md`:
   ```
   ## Step 1: Type-check
   - apps/dashboard: PASS / FAIL (N errors fixed)
   - apps/landing: PASS / FAIL (N errors fixed)
   ```

**Codex Prompt:**
```
Run npm run type-check in apps/dashboard and apps/landing.
Fix all TypeScript errors found. Common fixes: add 'use client', fix missing props interfaces, fix Lucide icon imports, add missing key props.
After all fixes, re-run type-check. Both must pass clean.
Append pass/fail result to .docs/ghost-ai/PROOF_LOG.md under "Step 1: Type-check".
```

---

## Step 2 — Live Supabase Tables Verification

**Goal:** Confirm karo ki production Supabase project me saari required tables exist aur writable hain.

**Tables to verify (from migrations 009, 010, 011):**
```
businesses
business_profiles
business_channels
assistant_playbooks
conversation_contacts
conversation_threads
conversation_messages
lead_qualification_answers
handoff_events
subscription_plans
business_subscriptions
business_usage
business_setup_checklist
subscription_invoices
```

**What Codex should do:**
Create a verification script `scripts/verify-supabase-tables.js`:

```javascript
// scripts/verify-supabase-tables.js
// Run: node scripts/verify-supabase-tables.js
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from agents/x7-re-summoner/.env

const fs = require('fs');
const path = require('path');

const REQUIRED_TABLES = [
  'businesses', 'business_profiles', 'business_channels',
  'assistant_playbooks', 'conversation_contacts', 'conversation_threads',
  'conversation_messages', 'lead_qualification_answers', 'handoff_events',
  'subscription_plans', 'business_subscriptions', 'business_usage',
  'business_setup_checklist', 'subscription_invoices'
];

// Load env from summoner
const envPath = path.join(__dirname, '../agents/x7-re-summoner/.env');
// parse and check each table via REST API
// Print: ✅ tablename EXISTS | ❌ tablename MISSING
// Append to PROOF_LOG.md
```

The script should:
1. Load `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `agents/x7-re-summoner/.env`
2. For each table, hit `GET {SUPABASE_URL}/rest/v1/{table}?limit=1` with service role key header
3. `200` or empty array = exists. `404` or error = missing.
4. Print result to terminal and append to `PROOF_LOG.md`

**Codex Prompt:**
```
Create scripts/verify-supabase-tables.js that:
1. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from agents/x7-re-summoner/.env
2. For each of the 14 required tables, hits Supabase REST API to verify existence
3. Prints ✅ or ❌ per table
4. Appends result summary to .docs/ghost-ai/PROOF_LOG.md under "Step 2: Supabase Tables"
Run the script and show output.
```

---

## Step 3 — Seed One Real Trial Business

**Goal:** Ek test business Supabase me insert karo (coaching vertical) taaki dashboard demo se real data pe switch ho sake.

**What to seed:**
```json
{
  "business": {
    "name": "WhatsAI Test Coaching Center",
    "vertical": "coaching",
    "city": "Indore",
    "status": "active"
  },
  "business_profile": {
    "owner_name": "Rohit Kag",
    "owner_phone": "+919876543210",
    "whatsapp_number": "+919876543210",
    "services": ["JEE Coaching", "NEET Coaching", "UPSC Coaching"],
    "pricing_range": "₹3,000 - ₹8,000/month",
    "faqs": [
      { "q": "Classes kab se start hoti hain?", "a": "Har mahine 1 tarikh se" },
      { "q": "Demo class milega?", "a": "Haan, pehle free demo class available hai" }
    ]
  },
  "business_channel": {
    "channel_type": "whatsapp",
    "channel_identifier": "+919876543210"
  },
  "subscription": {
    "status": "trialing",
    "trial_end": "7 days from now"
  }
}
```

**What Codex should do:**
Create `scripts/seed-trial-business.js`:
1. Load Supabase credentials from `agents/x7-re-summoner/.env`
2. Insert into `businesses` table
3. Insert into `business_profiles` table
4. Insert into `business_channels` table
5. Insert into `subscription_plans` (if not seeded)
6. Insert into `business_subscriptions` (status: trialing, trial_end: +7 days)
7. Call Supabase function `seed_setup_checklist(business_id)`
8. Also seed an `assistant_playbooks` row for coaching vertical
9. Print the created `business_id` (save this — needed for Step 4 and 5)
10. Append to `PROOF_LOG.md`

**Also update:** `agents/x7-re-summoner/.env` — set `DEFAULT_BUSINESS_ID` to the newly created business UUID.

**Codex Prompt:**
```
Create scripts/seed-trial-business.js that inserts a test coaching business into Supabase.
Insert: businesses, business_profiles, business_channels, business_subscriptions (trialing, trial_end +7 days), assistant_playbooks (coaching vertical).
Call seed_setup_checklist Supabase function.
Print created business_id. Update DEFAULT_BUSINESS_ID in agents/x7-re-summoner/.env with the new UUID.
Append result to .docs/ghost-ai/PROOF_LOG.md under "Step 3: Trial Business Seed".
```

---

## Step 4 — Local Agent Stack Health Verification

**Goal:** Saare agents locally start karo aur health check pass karo.

**Commands:**
```bash
./scripts/start-phase6-local.sh
sleep 3
./scripts/check-phase6-local.sh
```

**Expected health responses (all should be 200):**
```
sales-agent    200  http://localhost:8080/health
summoner       200  http://localhost:8082/health
content-agent  200  http://localhost:8083/health
ads-agent      200  http://localhost:8085/health
ghost-closer   200  http://localhost:8086/health
colony-agent   200  http://localhost:8087/health
finance-agent  200  http://localhost:8088/health
```

**What Codex should do:**
1. Run `check-phase6-local.sh` and capture output
2. For any agent not at 200, check its log file (`~/.codex-runtime/phase6/logs/{agent}.log`)
3. Common fixes:
   - Missing `node_modules` → `npm install` in that agent dir
   - Port conflict → kill previous process
   - Missing env var → check `.env` file
4. After all agents healthy, run a direct playbook test:
```bash
curl -s -X POST http://localhost:8080/playbook/qualify \
  -H "Content-Type: application/json" \
  -d '{"business_id":"<UUID from Step 3>","phone":"+911234567890","vertical":"coaching","message":"Hello, mujhe coaching ke baare mein jaanna hai","thread_id":"test-thread-001"}' \
  | jq .
```
5. Expected: `{ "type": "ask_qualification", ... }`
6. Append to `PROOF_LOG.md`

**Codex Prompt:**
```
Start local agent stack with ./scripts/start-phase6-local.sh.
Run ./scripts/check-phase6-local.sh and verify all agents return 200.
Fix any unhealthy agents (check logs, fix missing deps or env vars).
Run a direct /playbook/qualify test with the seeded business_id from Step 3.
Append health status and playbook test result to .docs/ghost-ai/PROOF_LOG.md under "Step 4: Agent Health".
```

---

## Step 5 — Signed Webhook Simulation (Summoner Ingress Test)

**Goal:** Simulate karo ki ek WhatsApp inbound message aaya, aur verify karo ki woh pura database flow complete karta hai.

**What Codex should do:**
Create `scripts/simulate-inbound-webhook.sh`:

```bash
#!/usr/bin/env bash
# Sends a properly signed Meta webhook payload to local Summoner
# Usage: ./scripts/simulate-inbound-webhook.sh

SUMMONER_URL="http://localhost:8082"
APP_SECRET=$(grep META_APP_SECRET agents/x7-re-summoner/.env | cut -d= -f2)
PHONE_NUMBER_ID=$(grep WHATSAPP_PHONE_NUMBER_ID agents/x7-re-summoner/.env | cut -d= -f2)

PAYLOAD=$(cat <<'EOF'
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "TEST_ENTRY",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "PHONE_ID_PLACEHOLDER" },
        "contacts": [{ "profile": { "name": "Priya Sharma" }, "wa_id": "919999888877" }],
        "messages": [{ "from": "919999888877", "id": "wamid.test001", "timestamp": "TIMESTAMP_PLACEHOLDER", "text": { "body": "Hello, mujhe JEE coaching ke baare mein jaanna hai" }, "type": "text" }]
      },
      "field": "messages"
    }]
  }]
}
EOF
)

# Replace placeholders
PAYLOAD=$(echo "$PAYLOAD" | sed "s/PHONE_ID_PLACEHOLDER/$PHONE_NUMBER_ID/g")
PAYLOAD=$(echo "$PAYLOAD" | sed "s/TIMESTAMP_PLACEHOLDER/$(date +%s)/g")

# Generate HMAC-SHA256 signature
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$APP_SECRET" | sed 's/SHA2-256(stdin)= //' | sed 's/.* //')

echo "Sending signed webhook to Summoner..."
RESPONSE=$(curl -s -X POST "$SUMMONER_URL/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$PAYLOAD")

echo "Response: $RESPONSE"
```

After running the script, verify in Supabase:
```sql
SELECT * FROM conversation_contacts ORDER BY created_at DESC LIMIT 3;
SELECT * FROM conversation_messages ORDER BY created_at DESC LIMIT 3;
SELECT * FROM lead_qualification_answers ORDER BY created_at DESC LIMIT 3;
```

**Codex Prompt:**
```
Create scripts/simulate-inbound-webhook.sh that sends a properly HMAC-SHA256 signed Meta WhatsApp webhook payload to local Summoner at port 8082.
Use PHONE_NUMBER_ID and META_APP_SECRET from agents/x7-re-summoner/.env.
After running, check Supabase for new rows in conversation_contacts, conversation_messages, lead_qualification_answers.
Append webhook response and DB write results to .docs/ghost-ai/PROOF_LOG.md under "Step 5: Webhook Simulation".
```

---

## Step 6 — Multi-Turn Conversation Simulation

**Goal:** Prove karo ki system ek multi-turn conversation handle karta hai — 3-4 messages mein qualification complete ho aur handoff trigger ho.

**What Codex should do:**
Create `scripts/simulate-conversation-flow.sh` that sends 4 sequential webhook payloads (with 1 second delay between each) from the same phone number:

**Message sequence (coaching vertical):**
1. `"Hello, mujhe coaching ke baare mein puchna tha"`
2. `"JEE mains ki tayyari karni hai"` (answers: course interest)
3. `"12th class mein hu"` (answers: student level)
4. `"Jald se jald start karna chahta hu, admission fees kya hai?"` (hot lead trigger — urgency + payment intent)

After message 4, verify in Supabase:
- `lead_qualification_answers` has 3+ answers for this thread
- `handoff_events` has one new row with reason = `hot_lead` or `payment_intent`

**Codex Prompt:**
```
Create scripts/simulate-conversation-flow.sh that sends 4 sequential signed webhook payloads from phone 919999888877 to simulate a coaching inquiry conversation.
Messages: greeting, course interest, student level, urgent payment inquiry.
After 4th message, check Supabase for lead_qualification_answers and handoff_events rows.
Append thread_id, answer count, and handoff trigger result to .docs/ghost-ai/PROOF_LOG.md under "Step 6: Conversation Flow".
```

---

## Step 7 — Dashboard Live Data Verification

**Goal:** Verify karo ki dashboard pages ab Supabase se real data dikha rahe hain (not demo fallback).

**What Codex should do:**

1. Start dashboard locally:
```bash
cd apps/dashboard && npm run dev &
sleep 5
```

2. Hit each page via curl to check response (pages should not crash):
```bash
curl -s http://localhost:3000/conversations -o /dev/null -w "%{http_code}"
curl -s http://localhost:3000/leads -o /dev/null -w "%{http_code}"
curl -s http://localhost:3000/handoffs -o /dev/null -w "%{http_code}"
curl -s http://localhost:3000/settings -o /dev/null -w "%{http_code}"
```

3. All should return `200`.

4. Check each page's data source:
   - `/conversations` — should show the seeded coaching contact from Step 3/5
   - `/handoffs` — should show the handoff from Step 6
   - `/leads` — should show qualified lead

5. Also hit the new API routes:
```bash
curl -s http://localhost:3000/api/settings/checklist -X GET
```

6. Append results to `PROOF_LOG.md`

**Codex Prompt:**
```
Start dashboard locally with npm run dev.
Run HTTP checks on /conversations, /leads, /handoffs, /settings — all must return 200.
Also test /api/settings/checklist API route.
Verify that pages are showing real Supabase data (not demo fallback) by checking if seeded contact from Step 3 appears in conversations page response.
Append all page status codes and data verification to .docs/ghost-ai/PROOF_LOG.md under "Step 7: Dashboard Live Data".
```

---

## Step 8 — Ngrok Setup Instructions Doc (for Rohit)

**Goal:** Codex khud ngrok nahi chala sakta (network restriction). But Rohit ke liye ek clear, copy-paste ready instruction doc banao.

**What Codex should do:**
Create `scripts/ngrok-webhook-setup.md`:

```markdown
# Setting Up Ngrok for Live WhatsApp Webhook

## Step 1: Start ngrok
```bash
ngrok http 8082
```
Copy the HTTPS URL shown (e.g., https://abc123.ngrok-free.app)

## Step 2: Update Meta Developer Portal
1. Go to https://developers.facebook.com/
2. Your App → WhatsApp → Configuration → Webhook
3. Callback URL: https://abc123.ngrok-free.app/webhook
4. Verify Token: (value from WHATSAPP_VERIFY_TOKEN in agents/x7-re-summoner/.env)
5. Click Verify and Save

## Step 3: Get Fresh Access Token
1. Go to WhatsApp → API Setup in Meta Developer Portal
2. Copy the temporary access token shown
3. Update WHATSAPP_ACCESS_TOKEN in agents/x7-re-summoner/.env
4. Also update in agents/x7-re-tool-gateway/.env

## Step 4: Send Test WhatsApp Message
From your personal WhatsApp, send a message to your business WhatsApp number.

## Step 5: Watch the Logs
```bash
tail -f ~/.codex-runtime/phase6/logs/summoner.log
```

## Expected Log Output
```
[summoner] webhook received from 91XXXXXXXXXX
[summoner] business resolved: WhatsAI Test Coaching Center
[summoner] routing to /playbook/qualify
[sales-agent] qualify called for coaching vertical
[sales-agent] question_key: course_interest returned
[summoner] outbound message saved to conversation_messages
```

## Step 6: Check Dashboard
Open http://localhost:3000/conversations
You should see the real WhatsApp contact and message.
```

**Codex Prompt:**
```
Create scripts/ngrok-webhook-setup.md with step-by-step copy-paste instructions for Rohit to:
1. Start ngrok on port 8082
2. Configure Meta Developer Portal webhook URL
3. Get a fresh WhatsApp access token
4. Send a real test message
5. Watch Summoner logs
6. Verify conversation in dashboard
Include exact commands, expected log output, and dashboard verification steps.
Append "Step 8: Ngrok Setup Doc created" to .docs/ghost-ai/PROOF_LOG.md.
```

---

## Step 9 — Landing Page Verify + WhatsApp CTA Config

**Goal:** Landing page ka WhatsApp CTA button correct number pe point kare.

**File:** `apps/landing/` (wherever the CTA button is)

**Current state:** CTA button me WhatsApp link hai, but number placeholder ho sakta hai.

**What Codex should do:**
1. Find the CTA button component in `apps/landing/`
2. Update the WhatsApp link to use the actual business WhatsApp number from Step 3
3. Pre-filled message should be:
   ```
   https://wa.me/91XXXXXXXXXX?text=Hello%2C%20mujhe%20X7%20WhatsAI%20Assistant%20ke%20baare%20mein%20jaanna%20hai
   ```
4. Run `npm run type-check` in `apps/landing/`
5. Start landing locally:
   ```bash
   cd apps/landing && npm run dev -- --port 3002
   ```
6. Curl check:
   ```bash
   curl -s http://localhost:3002 -o /dev/null -w "%{http_code}"
   ```
   Should return `200`.
7. Append to `PROOF_LOG.md`

**Codex Prompt:**
```
In apps/landing, find the primary CTA button and update its WhatsApp link to point to the seeded business phone number from Step 3.
Pre-filled message: "Hello, mujhe WhatsAI Assistant ke baare mein jaanna hai".
Run type-check. Start landing on port 3002. Verify it returns 200.
Append result to .docs/ghost-ai/PROOF_LOG.md under "Step 9: Landing CTA".
```

---

## Step 10 — Final Proof Report Generation

**Goal:** Ek complete `PHASE_11_PRODUCTION_PROOF.md` document generate karo jo poora status show kare — aur Rohit ke liye clear "launch checklist" ho.

**What Codex should do:**
Create `.docs/ghost-ai/PHASE_11_PRODUCTION_PROOF.md` with:

```markdown
# WhatsAI Assistant — Phase 11 Production Proof Report

Generated: [timestamp]

## System Overview
Product: WhatsAI Assistant
Version: Phase 11 (Post-Pivot MVP)
Repo: whatsai-assistant

## Completed Phases (1-10)
[Summary of what was built]

## Phase 11 Step Results
| Step | Description | Status | Notes |
|---|---|---|---|
| 1 | Type-check | ✅/❌ | |
| 2 | Supabase tables | ✅/❌ | N tables verified |
| 3 | Trial business seeded | ✅/❌ | business_id: xxx |
| 4 | Agent health | ✅/❌ | all 200 / N agents failed |
| 5 | Webhook simulation | ✅/❌ | DB writes confirmed |
| 6 | Multi-turn flow | ✅/❌ | handoff triggered |
| 7 | Dashboard live data | ✅/❌ | pages returning real data |
| 8 | Ngrok setup doc | ✅ | |
| 9 | Landing CTA | ✅/❌ | |
| 10 | This report | ✅ | |

## Current Blockers
1. Meta WhatsApp token expired — needs fresh token from developer.facebook.com
2. [Any other blockers]

## What IS Proven
- [List of things that work]

## What IS NOT Proven (needs live Meta token)
- Actual WhatsApp outbound message delivery
- Real WhatsApp inbound message from personal phone

## Pre-Launch Checklist for Rohit
- [ ] Get fresh Meta WhatsApp Access Token
- [ ] Configure ngrok URL in Meta Developer Portal
- [ ] Run ./scripts/simulate-inbound-webhook.sh on live
- [ ] Verify one real WhatsApp message flow end-to-end
- [ ] Deploy dashboard to Vercel
- [ ] Deploy landing to Vercel
- [ ] Set production env vars in Vercel dashboard
- [ ] Choose first 3 trial niches (coaching / clinic / real estate)
- [ ] Prepare demo script for sales pitch

## Environment Variables Needed in Production
[List of all required env vars for each service]

## Deploy Commands
[Exact commands to deploy to Vercel]
```

**Codex Prompt:**
```
Create .docs/ghost-ai/PHASE_11_PRODUCTION_PROOF.md as a final proof report.
Include:
- Phase 1-10 completion summary
- Phase 11 step-by-step results table (read from PROOF_LOG.md)
- Current blockers (Meta token expired)
- What IS proven vs what needs live token
- Pre-launch checklist for Rohit
- All required environment variables per service
- Vercel deploy commands for dashboard and landing
Run this as the final step after Steps 1-9 complete.
```

---

## Execution Order for Codex

**Run strictly in this order:**

```
Step 1  → type-check fix
Step 2  → supabase table verify script
Step 3  → seed trial business
Step 4  → agent health check
Step 5  → webhook simulation
Step 6  → multi-turn conversation
Step 7  → dashboard live data verify
Step 8  → ngrok doc for Rohit
Step 9  → landing CTA update
Step 10 → final proof report
```

**After each step:** Append result to `.docs/ghost-ai/PROOF_LOG.md`.

**PROOF_LOG.md format:**
```markdown
# Phase 11 Proof Log

## Step 1: Type-check
- apps/dashboard: PASS
- apps/landing: PASS
Date: 2026-07-09

## Step 2: Supabase Tables
- 14/14 tables verified ✅
Date: 2026-07-09
...
```

---

## Key Files Reference

| Script | Purpose |
|---|---|
| `scripts/verify-supabase-tables.js` | Check all 14 tables exist live |
| `scripts/seed-trial-business.js` | Insert test coaching business |
| `scripts/simulate-inbound-webhook.sh` | Single webhook test |
| `scripts/simulate-conversation-flow.sh` | 4-message multi-turn test |
| `scripts/ngrok-webhook-setup.md` | Rohit ke liye manual Meta setup guide |
| `.docs/ghost-ai/PROOF_LOG.md` | Running log of all step results |
| `.docs/ghost-ai/PHASE_11_PRODUCTION_PROOF.md` | Final proof report |

---

## What Rohit Will Do Manually (After Codex finishes)

1. **Get fresh Meta WhatsApp token** from developers.facebook.com
2. **Run:** `node scripts/setup-phase6-env.js` with new token
3. **Start ngrok:** `ngrok http 8082`
4. **Configure** ngrok URL in Meta Developer Portal
5. **Send** a real WhatsApp message from personal phone
6. **Verify** in dashboard `/conversations`
7. **Deploy** dashboard + landing to Vercel

That's it. Product is live.

---

**Start with Step 1. Run type-check. Fix errors. Move to Step 2. Do not skip steps.**
