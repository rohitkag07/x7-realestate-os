# WhatsAI Assistant - Local Runbook

## Install

Run `npm install` inside the app or agent you want to start if `node_modules` is missing.

Canonical repo path:

```text
/Users/rohit/Projects/whatsai-assistant
```

The old spaced folder `/Users/rohit/Documents/Claude/Projects/WhatsAI Assistant` is deprecated and should not receive new WhatsAI work.

## Dashboard

```bash
npm run dev
```

Default URL:

```text
http://localhost:3000
```

## Agent Mesh

Start:

```bash
pm2 start ecosystem.config.cjs --update-env
```

Check:

```bash
pm2 list
```

Stop:

```bash
pm2 stop whatsai-sales-agent whatsai-tool-gateway whatsai-summoner
```

## Default Local Ports

- sales / assistant compatibility service `8080`
- tool-gateway `8081`
- summoner `8082`

Only these three services are required for the WhatsAI lead-to-appointment MVP.
Content, ads, ghost-closer, colony, and finance agents are deferred modules and are not launch blockers.

## Useful Checks

```bash
curl -s http://localhost:8082/health
curl -s http://localhost:8082/health/dependencies
curl -s http://localhost:3000/api/agent-mesh/health
npm run prove:whatsai
```

## Full Mesh Quick Cycle

```bash
pm2 start ecosystem.config.cjs
pm2 list
pm2 restart all
```

## High-Value Local Smoke Tests

1. open `http://localhost:3000`
2. verify lead/conversation-ready dashboard surfaces render with styling
3. verify `http://localhost:3000/api/agent-mesh/health`
4. verify `http://localhost:8082/health`
5. if testing webhook ingress, hit Summoner `GET /webhooks/whatsapp` with challenge params
6. for pivot work, verify default business/playbook fallback before sending WhatsApp messages
7. run `npm run prove:whatsai` before calling the local runtime ready

## Notes

- many flows degrade gracefully without live credentials
- production-like behavior requires real env vars from `ENV_CONTRACT.md`
- if UI looks stale, restart local dev servers and hard refresh
- if a page renders unstyled, check the dashboard dev server first before assuming the page code is broken
- do not remove current real-estate local paths while building the generic WhatsAI layer
