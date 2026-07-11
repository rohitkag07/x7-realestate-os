# X7 WhatsAI Assistant - Local Runbook

## Install

Run `npm install` inside the app or agent you want to start if `node_modules` is missing.

Canonical repo path:

```text
/Users/rohit/Projects/x7-realestate-os
```

The old spaced folder `/Users/rohit/Documents/Claude/Projects/X7 Real estate` is deprecated and should not receive new WhatsAI work.

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
pm2 start ecosystem.config.cjs
```

Check:

```bash
pm2 list
```

Stop:

```bash
pm2 stop x7-sales-agent x7-tool-gateway x7-summoner
```

## Default Local Ports

- sales / assistant compatibility service `8080`
- tool-gateway `8081`
- summoner `8082`
- content `8083`
- ads `8085`
- ghost-closer `8086`
- colony `8087`
- finance `8088`

## Useful Checks

```bash
curl -s http://localhost:8082/health
curl -s http://localhost:8082/health/dependencies
curl -s http://localhost:3000/api/agent-mesh/health
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

## Notes

- many flows degrade gracefully without live credentials
- production-like behavior requires real env vars from `ENV_CONTRACT.md`
- if UI looks stale, restart local dev servers and hard refresh
- if a page renders unstyled, check the dashboard dev server first before assuming the page code is broken
- do not remove current real-estate local paths while building the generic WhatsAI layer
