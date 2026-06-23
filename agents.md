# X7 RealEstate OS - Agent Guide

## Agent Contract Rules

- every agent is an independent Node/Express service
- all inter-agent traffic uses `x-agent-secret`
- health surface should include `GET /health`
- dependencies surface should include `GET /health/dependencies`
- domain mutations should be explicit and narrow

## Current Local Ports

- sales `8080`
- tool-gateway `8081`
- summoner `8082`
- content `8083`
- ads `8085`
- ghost-closer `8086`
- colony `8087`
- finance `8088`

## Summoner Rules

Summoner is responsible for:

- intent routing
- queue orchestration
- cron fan-out
- central WhatsApp ingress

## Tool Gateway Rule

If an agent needs external execution, prefer Tool Gateway rather than embedding direct vendor logic in multiple services.
