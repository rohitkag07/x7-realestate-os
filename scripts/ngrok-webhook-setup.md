# Setting Up Ngrok for Live WhatsApp Webhook

## Step 1: Start ngrok

```bash
ngrok http 8082
```

Copy the HTTPS URL shown, for example:

```text
https://abc123.ngrok-free.app
```

## Step 2: Update Meta Developer Portal

1. Go to https://developers.facebook.com/
2. Open your app.
3. Go to WhatsApp -> Configuration -> Webhook.
4. Callback URL:

```text
https://abc123.ngrok-free.app/webhook
```

5. Verify Token: use the value from `WHATSAPP_VERIFY_TOKEN` in `agents/x7-re-summoner/.env`.
6. Click Verify and Save.

To print the verify token locally:

```bash
grep '^WHATSAPP_VERIFY_TOKEN=' agents/x7-re-summoner/.env
```

## Step 3: Get Fresh Access Token

1. Go to WhatsApp -> API Setup in Meta Developer Portal.
2. Copy the temporary access token shown by Meta.
3. Update `WHATSAPP_ACCESS_TOKEN` in `agents/x7-re-summoner/.env`.
4. Update `WHATSAPP_ACCESS_TOKEN` in `agents/x7-re-tool-gateway/.env`.

Example:

```bash
# Edit both files and replace the old token value.
code agents/x7-re-summoner/.env agents/x7-re-tool-gateway/.env
```

## Step 4: Restart Local Stack

```bash
./scripts/start-phase6-local.sh
sleep 3
./scripts/check-phase6-local.sh
```

Expected health result:

```text
sales-agent 200 http://localhost:8080/health
tool-gateway 200 http://localhost:8081/health
summoner 200 http://localhost:8082/health
```

## Step 5: Send Test WhatsApp Message

From your personal WhatsApp, send a message to your business WhatsApp number.

Example message:

```text
Hello, mujhe coaching ke baare mein jaanna hai
```

## Step 6: Watch the Logs

```bash
tail -f ~/.codex-runtime/phase6/logs/summoner.log
```

In another terminal, you can also watch the sales agent:

```bash
tail -f ~/.codex-runtime/phase6/logs/sales-agent.log
```

## Expected Log Output

```text
[summoner] webhook received from 91XXXXXXXXXX
[summoner] business resolved: WhatsAI Test Coaching Center
[summoner] routing to /playbook/qualify
[sales-agent] qualify called for coaching vertical
[sales-agent] question_key: course_interest returned
[summoner] outbound message saved to conversation_messages
```

## Step 7: Check Dashboard

Open:

```text
http://localhost:3000/conversations
```

You should see the real WhatsApp contact and message.

Quick terminal check:

```bash
curl -s http://localhost:3000/conversations | grep -o "919999888877\\|JEE\\|coaching" | head -5
```

If rows appear, the dashboard is reading live Supabase data.

## Troubleshooting

If Meta verification fails:

1. Confirm ngrok is still running.
2. Confirm the callback URL ends with `/webhook`.
3. Confirm the verify token exactly matches `WHATSAPP_VERIFY_TOKEN`.

If inbound works but outbound fails:

1. Get a fresh Meta WhatsApp access token.
2. Update both `.env` files:
   - `agents/x7-re-summoner/.env`
   - `agents/x7-re-tool-gateway/.env`
3. Restart the local stack.

If dashboard does not show the message:

```bash
./scripts/check-phase6-local.sh
curl -s http://localhost:3000/conversations | grep -o "919999888877\\|JEE\\|coaching" | head -5
```
