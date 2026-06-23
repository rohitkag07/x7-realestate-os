# X7 RealEstate OS - Next Build Plan

## Priority Order

1. live integration hardening
2. production verification proof
3. production orchestration confidence
4. residual product gaps

## Best Next Technical Moves

### 1. Prove Live Supabase Wiring

- use dashboard Settings -> Ops and `/api/ops/readiness` as the first truth source
- move the most important surfaces off fallback/demo mode
- verify at least one real builder/project context end-to-end
- confirm queue and write paths persist correctly

### 2. Prove Summoner-First WhatsApp Ingress

- verify public webhook challenge on the deployed Summoner
- verify inbound WhatsApp routing into sales and colony contexts
- verify message status updates persist

### 3. Prove Finance Path With Razorpay Test Events

- validate webhook signature handling
- confirm payment state updates and receipts or invoice-linked records
- remove ambiguity around simulated versus live finance behavior

### 4. Production Scheduler Confidence

- prove at least one cron job execution through Summoner
- confirm queue drain works against live data
- decide whether additional worker isolation is needed before launch

### 5. Residual Product Gaps

- visitor export/report UI
- final WhatsApp conversation hydration polish
- final live credential proofs for media and ad providers
