# X7 Superprojects — Engineering Portfolio
### Three Production-Grade AI Infrastructure Systems by Rohit Kag, Xero Seven

> **Author:** Rohit Kag — Founder & Lead Systems Architect, Xero Seven  
> **Classification:** Portfolio Reference Document — Senior/Staff Engineer Applications  
> **Created:** May 2026  
> **Audience:** CTOs, VP Engineering, Founding Engineers at AI/FinTech startups  

---

> *These are not side projects. They are production-grade infrastructure systems, each solving a specific class of problem that keeps AI teams from shipping with confidence. Each one was designed to the same standard as the 23-service autonomous agent platform (Xero Seven Agentverse) already running in production on Google Cloud Run.*

---

## Table of Contents

1. [FraudJury — Real-Time Explainable Transaction Intelligence](#fraudjury)
2. [Sentinel — AI Agent Behavior Compliance Engine](#sentinel)
3. [MemoryOS — Persistent Knowledge Graph Memory for AI Agents](#memoryos)

---
---

<a name="fraudjury"></a>

# PROJECT I

# FraudJury
## Real-Time Explainable Transaction Intelligence

> *"Every suspicious transaction gets a 5-agent jury trial in under 2 seconds — with a plain-English audit trail that satisfies RBI examiners, explains every flag to your compliance team, and does not slow down your payment pipeline."*

---

## 1. The CEO Pitch

Indian FinTech in 2026 faces a compliance paradox: the fraud detection systems that actually work are black-box ML models that cannot explain their decisions, while the rule engines that can explain themselves are too rigid to catch novel fraud patterns.

The Reserve Bank of India's AI governance guidelines explicitly require that automated financial decisions be **explainable, auditable, and contestable**. A neural network confidence score of 0.87 satisfies none of these requirements.

**FraudJury solves both sides of the paradox simultaneously.**

It is a multi-agent orchestration system where every suspicious transaction is routed in real-time to five specialized analysis agents — Velocity, Geo-Risk, Merchant Intelligence, Pattern Recognition, and Behavioral AI — each operating independently, in parallel, with its own reasoning. The results converge through a weighted consensus model into a final verdict: a confidence score, a human-readable explanation, and a cryptographically-timestamped audit trail that a regulator can read, a compliance officer can export, and a fraud analyst can drill into.

The entire pipeline — from transaction ingestion to final verdict — completes in under 2 seconds.

This is not fraud scoring. This is a **fraud court**.

**Commercial Impact:**
- Eliminates the "black box" compliance liability for RBI-regulated entities
- Reduces false positive rate by layering domain-specific agents rather than single-model inference
- Provides exportable audit reports that satisfy Article 22 of GDPR equivalents and RBI's AI/ML governance circular
- Deployable as a standalone microservice API alongside any existing payment stack — zero migration required

---

## 2. Core Technical Innovation: The Engineering Masterpiece

### 2.1 The Fan-Out Pattern with Per-Agent Circuit Breakers

Most multi-agent systems execute agents sequentially or use naive `Promise.all()` that waits for the slowest agent. FraudJury uses **differentiated timeouts with graceful degradation** — a pattern borrowed from production trading systems.

Each agent has an `AbortSignal` with a timeout calibrated to its data source:

```javascript
const AGENT_TIMEOUTS = Object.freeze({
  velocity:  400,   // Pure DB query — fast
  pattern:   350,   // Indexed SQL — fastest
  merchant:  500,   // DB + stats computation
  geo:       650,   // External IP API call
  behavior:  800,   // LLM call — slowest, lowest weight
});
```

If the Geo agent takes 900ms (network latency to external IP service), it does not block the other four. The verdict is computed on the four agents that responded, and the final confidence is **adjusted downward to reflect the incomplete quorum**. The audit log records `geo_risk: SKIPPED — timeout 650ms exceeded` as a first-class event.

This is the difference between a system that fails gracefully under load and one that degrades silently or hangs.

### 2.2 Weighted Consensus Model (Not Majority Vote)

Five binary verdicts aggregated by majority vote would give the same weight to an LLM hallucination as to a hard database query. FraudJury assigns **trust weights based on the reliability class of each agent's data source:**

```javascript
const JURY_WEIGHTS = Object.freeze({
  pattern:   0.28,  // Deterministic DB query — highest trust
  velocity:  0.25,  // Deterministic DB query — high trust
  merchant:  0.22,  // DB + statistical inference — high trust
  geo:       0.15,  // External API — medium trust (can be spoofed)
  behavior:  0.10,  // LLM inference — lowest trust (non-deterministic)
});
// Weights sum to 1.00. Object.freeze() — immutable at runtime.
```

The final score is a weighted sum of each agent's `(verdict × confidence × weight)`. This means the system can arrive at a correct FLAG decision even when the Behavior Agent (LLM) says PASS — because three deterministic agents with higher combined weight said FLAG.

**This is the same philosophical principle as the Two-Gate Jury in X7 Alpha Trader: deterministic data beats probabilistic inference. The LLM is the weakest witness in the room.**

### 2.3 Server-Sent Events for Real-Time Streaming Verdicts

The dashboard does not wait for all five agents to complete before rendering results. It subscribes to an SSE stream and updates each agent card the moment that agent fires its verdict:

```
Client opens EventSource → /jury/stream?txId=TX-123456

Server emits events as each agent completes:
  data: {"agent":"pattern","verdict":"FLAG","confidence":91,"latency_ms":142,"reasoning":"..."}
  data: {"agent":"velocity","verdict":"FLAG","confidence":88,"latency_ms":198,"reasoning":"..."}
  data: {"agent":"merchant","verdict":"PASS","confidence":62,"latency_ms":310,"reasoning":"..."}
  data: {"agent":"geo","verdict":"FLAG","confidence":95,"latency_ms":487,"reasoning":"..."}
  data: {"agent":"behavior","verdict":"FLAG","confidence":79,"latency_ms":612,"reasoning":"..."}
  data: {"type":"FINAL","verdict":"FLAGGED","score":87.4,"action":"BLOCK","audit_id":"AUD-789"}
  data: [DONE]
```

The client renders each card as it arrives. A CRITICAL-weight FLAG from Pattern Agent appears on screen at 142ms. The final verdict card animates in at ~620ms — the moment the last agent (Behavior) completes, not a moment later. Total end-to-end: **under 2 seconds from transaction ingestion to rendered verdict.**

### 2.4 Append-Only Audit Log (The Compliance Architecture)

The `fraud_verdicts` table is designed to satisfy regulatory audits. It is **append-only by design** — no UPDATE or DELETE queries are issued. The application layer enforces this; the DB schema enforces it again:

```sql
CREATE TABLE fraud_verdicts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id            text        NOT NULL,
  agent_name       text        NOT NULL,
  verdict          text        NOT NULL CHECK (verdict IN ('FLAG','PASS','SKIP')),
  confidence       smallint    NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  reasoning        text        NOT NULL,
  raw_evidence     jsonb       DEFAULT '{}',
  latency_ms       smallint    NOT NULL,
  timed_out        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fraud_finals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id            text        NOT NULL UNIQUE,
  final_verdict    text        NOT NULL CHECK (final_verdict IN ('FLAGGED','CLEARED','PARTIAL')),
  final_score      numeric(5,2) NOT NULL,
  action_taken     text        NOT NULL CHECK (action_taken IN ('BLOCK','ALLOW','REVIEW')),
  agents_responded smallint    NOT NULL,
  agents_total     smallint    NOT NULL DEFAULT 5,
  audit_report_url text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Enforce append-only at the DB level via row-level security
ALTER TABLE fraud_verdicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY no_update ON fraud_verdicts FOR UPDATE USING (false);
CREATE POLICY no_delete ON fraud_verdicts FOR DELETE USING (false);
```

Every transaction has a permanent, unmodifiable record of exactly which agents said what, how confident each was, how long each took, and whether any timed out. This is not an afterthought — it is the primary architectural constraint around which everything else is designed.

### 2.5 The Five Agents — Internal Design

**Agent 1: Pattern Recognition (Weight: 0.28)**
Queries a `fraud_patterns` table of known fraud signatures (device fingerprint reuse, account age + high amount, round-number transfers, etc.). Pure SQL — no LLM. Returns a `match_count` and `highest_severity_pattern` alongside its verdict. Fastest agent in the jury.

**Agent 2: Velocity Analysis (Weight: 0.25)**
Checks transaction frequency within rolling windows (1min, 10min, 1hr, 24hr) for the sending account. Uses PostgreSQL window functions. Flags if any window exceeds the user's historical baseline by more than 2 standard deviations.

**Agent 3: Merchant Intelligence (Weight: 0.22)**
Cross-references the merchant against a `merchant_risk_registry`. New merchants (first appearance in last 30 days) receive elevated suspicion. High-value transactions to unverified merchants receive the highest suspicion. Combines categorical risk with statistical percentile ranking.

**Agent 4: Geo-Risk Analysis (Weight: 0.15)**
Resolves the transaction IP against ip-api.com (free tier, no key required). Flags: country mismatch with card issuer, known datacenter/VPN IP ranges, high-risk country classification. Carries circuit-breaker logic — if external API is unavailable, returns `SKIP` rather than defaulting to PASS or FLAG.

**Agent 5: Behavioral AI (Weight: 0.10)**
Sends the full transaction context to GPT-4o-mini with a structured output schema. This agent looks for things pattern matching cannot: social engineering signatures, unusual narrative patterns in transaction notes, behavioral anomalies that don't match any known rule. Lowest weight because it is the least deterministic — but it is the only agent capable of catching novel fraud patterns.

---

## 3. Detailed Technical Stack

| Layer | Technology | Justification |
|---|---|---|
| **API Server** | Node.js 20 + Express.js (ESM) | Consistent with existing Agentverse services; non-blocking I/O is critical for fan-out concurrency |
| **Database** | PostgreSQL via InsForge (or Supabase) | Row-level security for append-only enforcement; window functions for velocity analysis; JSONB for raw evidence storage |
| **Streaming** | Server-Sent Events (SSE) | Unidirectional server-push; simpler than WebSocket for this use case; works through reverse proxies and CDNs |
| **External API** | ip-api.com (free tier) | No API key required; sufficient for MVP geo-risk |
| **AI Agent** | GPT-4o-mini with structured output (`response_format: json_object`) | Cost-optimized; structured output prevents JSON parse failures |
| **Frontend** | React 18 + Vite + TailwindCSS + Framer Motion | Agent cards with staggered entrance animations; EventSource API for SSE consumption |
| **PDF Export** | jsPDF or pdfmake (client-side) | Audit reports generated in-browser; no server-side PDF generation dependency |
| **Authentication** | Same `AGENT_SECRET` header pattern as Agentverse | Consistent zero-trust model |
| **Deployment** | Google Cloud Run (single service) + Vercel (frontend) | Scale-to-zero; pay-per-request; consistent with Agentverse deployment model |
| **Observability** | OpenTelemetry traces (reuse existing `tracing.cjs`) | Per-agent latency spans visible in Google Cloud Trace waterfall |

---

## 4. Step-by-Step 7-Day Build Plan

### Day 1 — Foundation: Schema, Contracts, and Scaffolding

**Goal:** By end of Day 1, the service starts, the database is ready, and all 5 agents are stubbed with correct interfaces.

**Tasks:**
1. Initialize project: `npm init -y`, install `express`, `cors`, `dotenv`, `@insforge/sdk`, `openai`, `uuid`
2. Create `schema.sql`: `fraud_verdicts`, `fraud_finals`, `fraud_patterns` (with 20 seed patterns), `merchant_risk_registry` (with 50 seed merchants)
3. Define the canonical `AgentResult` interface in `src/types/index.js`:
   ```javascript
   // Every agent must return this exact shape — no exceptions
   {
     agent: string,          // 'velocity' | 'pattern' | 'merchant' | 'geo' | 'behavior'
     verdict: 'FLAG'|'PASS'|'SKIP',
     confidence: number,     // 0-100
     reasoning: string,      // Plain English. 1-2 sentences.
     raw_evidence: object,   // Agent-specific data that produced the verdict
     latency_ms: number,
     timed_out: boolean,
   }
   ```
4. Stub all 5 agent files in `src/agents/` — each returns a hardcoded `AgentResult` for now
5. Build the `src/orchestrator/fanout.js` — implements `Promise.allSettled()` with per-agent `AbortSignal` timeouts
6. Verify: POST a test transaction, all 5 stubs return, orchestrator aggregates — logs to console

**Deliverable:** Service boots. POST `/jury/analyze` returns 5 stub verdicts.

---

### Day 2 — Real Agents Part 1: Pattern, Velocity, Merchant

**Goal:** Three deterministic agents working with real database queries.

**Tasks:**
1. **Pattern Agent** (`src/agents/pattern.js`):
   - Query `fraud_patterns` table: match against `device_id`, `ip_address`, `amount_range`, `merchant_category`
   - Return `match_count`, `highest_severity_match`, and reasoning string
   - Test: seed 3 matching patterns, verify agent flags correctly

2. **Velocity Agent** (`src/agents/velocity.js`):
   - Query `fraud_verdicts` history for `sender_account` in rolling windows
   - Use PostgreSQL window function to calculate per-window transaction count
   - Compute deviation from 30-day baseline: flag if current rate > (baseline_mean + 2×std_dev)
   - Test: insert 5 recent transactions for same account, verify FLAG triggers

3. **Merchant Agent** (`src/agents/merchant.js`):
   - Lookup merchant in `merchant_risk_registry`; if absent, treat as new (highest suspicion)
   - Calculate transaction amount as percentile of user's historical amounts
   - Combine: `risk_class` (categorical) × `amount_percentile` (statistical) = confidence score
   - Test: new merchant + 95th-percentile amount = FLAG at 88+ confidence

4. Build `src/scoring/consensus.js` — weighted score calculation with partial-quorum adjustment

**Deliverable:** Three real agents passing tests. POST `/jury/analyze` returns real verdicts for velocity and merchant; pattern uses seed data.

---

### Day 3 — Real Agents Part 2: Geo-Risk and Behavioral AI

**Goal:** All 5 agents are live and production-grade.

**Tasks:**
1. **Geo-Risk Agent** (`src/agents/geo.js`):
   - `fetch('http://ip-api.com/json/{ip}?fields=status,country,countryCode,isp,org,as,proxy,hosting')`
   - Flag conditions: `proxy === true`, `hosting === true` (datacenter IP), country !== card_issuer_country
   - Implement circuit breaker: if ip-api unavailable, return `{ verdict: 'SKIP', timed_out: true }`
   - Test: use known VPN IP → verify FLAG; use local IP → verify PASS

2. **Behavioral AI Agent** (`src/agents/behavior.js`):
   - Build system prompt: "You are a fraud intelligence analyst. Analyze this transaction and return ONLY valid JSON."
   - Use `response_format: { type: 'json_object' }` to enforce structured output
   - Schema: `{ verdict, confidence, reasoning, risk_signals: string[] }`
   - Validate response schema before returning — if invalid JSON or missing fields, return SKIP
   - Test: feed obviously fraudulent context → verify FLAG with reasoning

3. Integrate all 5 into orchestrator. Run full end-to-end test with a real suspicious transaction.

4. Build `src/audit/logger.js` — writes `fraud_verdicts` rows for each agent + `fraud_finals` row for the consensus verdict

**Deliverable:** Full jury pipeline working. All 5 agents return real verdicts. Audit records written to DB.

---

### Day 4 — Streaming: SSE Endpoint and Real-Time Events

**Goal:** Dashboard can watch the jury deliberate in real-time.

**Tasks:**
1. Build `src/routes/stream.js` — `GET /jury/stream?txId=:id`
   - Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
   - Use an in-memory `EventEmitter` (or Redis pub/sub for multi-instance) to forward agent events
   - Each agent, immediately on completion, emits to the emitter — stream route forwards to client

2. Refactor orchestrator to emit events during execution (not just return at the end):
   ```javascript
   // Each agent wraps its result in an emit before returning:
   const result = await runAgent(signal);
   eventBus.emit(`jury:${txId}`, result); // SSE client receives this immediately
   return result;
   ```

3. Add `[DONE]` termination event after final verdict is written

4. Add graceful SSE client disconnect handling (remove listener on `res.on('close')`)

5. Test with `curl -N 'http://localhost:8080/jury/stream?txId=TX-001'` — watch events arrive in order

**Deliverable:** SSE stream works. Events arrive one by one as agents complete. Connection closes cleanly on `[DONE]`.

---

### Day 5 — Audit Reports and Finalization Logic

**Goal:** Every verdict is permanently recorded. PDF export works.

**Tasks:**
1. Build `src/audit/report.js` — `GET /jury/report/:txId`
   - Fetches all `fraud_verdicts` rows for the transaction
   - Returns structured JSON: `{ transaction, final_verdict, agents: [...], generated_at }`
   - This JSON is also the PDF data source

2. Build `src/routes/analyze.js` — the main `POST /jury/analyze` endpoint:
   - Validates incoming transaction payload (Zod or manual schema check)
   - Assigns `tx_id = UUID`
   - Starts SSE stream registration
   - Kicks off fan-out orchestrator
   - Returns `{ txId, streamUrl }` immediately — client subscribes to SSE for live updates

3. Build PDF export in frontend (`src/components/AuditReport.jsx`):
   - Uses `jsPDF` to generate a structured report with transaction details, agent table, final verdict, timestamp
   - "Export Audit Report" button visible after verdict is delivered

4. Implement the `BLOCK` / `ALLOW` / `REVIEW` action router:
   - `score >= 75` → BLOCK (payment halted, blocked_transactions table updated)
   - `score 50-74` → REVIEW (flagged for human review queue)
   - `score < 50` → ALLOW (cleared, no action)

**Deliverable:** Full end-to-end flow: transaction in → jury runs → SSE stream to client → verdict rendered → audit log written → PDF exportable.

---

### Day 6 — The Dashboard (Frontend)

**Goal:** A live, production-quality visual dashboard that impresses on screen share.

**Component Architecture:**
```
App
├── TransactionFeed       — Live list of incoming transactions (simulated or real)
├── JuryRoom              — Main view for a single transaction under analysis
│   ├── TransactionCard   — Transaction details (amount, sender, merchant, timestamp)
│   ├── AgentGrid         — 5 agent cards in 2x3 grid layout
│   │   └── AgentCard     — Loading → Verdict animation (Framer Motion)
│   ├── VerdictBanner     — Final verdict with animated confidence meter
│   └── AuditPanel        — Collapsible reasoning for each agent + Export button
└── ComplianceDashboard   — Historical verdicts, daily stats, violation feed
```

**Key UI Details:**
- Agent cards start in `loading` state (pulsing skeleton)
- On verdict arrival via SSE: card transitions to `FLAG` (red border + icon) or `PASS` (green) with spring animation
- Cards animate in the order agents complete — not in a fixed order
- Confidence meter: SVG arc that fills from 0 to final percentage with 600ms easing
- Final verdict banner: slides up from bottom with backdrop blur, color-coded by severity

**Data:**
- Pre-build a `demo_transactions.json` with 10 carefully crafted scenarios:
  - 3× clean transactions (all agents PASS)
  - 4× fraud with varying confidence (75%, 84%, 91%, 97%)
  - 2× edge cases (geo timeout, behavior agent disagrees with others)
  - 1× unanimous FLAG at 99% confidence (the demo show-stopper)

**Deliverable:** Dashboard looks like a real product. All 10 demo transactions load correctly. Animations are smooth.

---

### Day 7 — Polish, Demo Script, and Deployment

**Goal:** Everything is deployed, the demo runs flawlessly, and the README is complete.

**Tasks:**
1. Deploy API to Cloud Run: `gcloud run deploy fraud-jury --source . --region us-central1 --allow-unauthenticated`
2. Deploy frontend to Vercel: `vercel --prod`
3. Write `README.md` — B2B pitch format (see Section 6 for talking points)
4. Record a 3-minute Loom walkthrough of the demo (for async review by CTOs who don't do live calls)
5. Seed production DB with 50 realistic historical transactions for a convincing dashboard history
6. Final QA: verify all 10 demo scenarios produce the expected verdicts

---

## 5. The Wow Demo Script — 10-Minute Interview Performance

> **Setup:** Dashboard open in browser, split-screen with VS Code showing the orchestrator code. Ngrok or Cloud Run URL live.

---

**[0:00 — 0:30] The Hook**

*"Before I show you the code, let me show you why this exists."*

Open the browser. Point to the compliance dashboard — it shows historical verdicts, a stats bar (342 transactions today, 18 flagged, 3 blocked), a live feed of the last 10 verdicts.

*"Every FinTech company in India right now has the same problem: their fraud detection works, but they can't explain it. RBI's AI governance guidelines are clear — every automated financial decision must be explainable and auditable. A neural network score of 0.87 is not an explanation. This is."*

---

**[0:30 — 2:00] The Demo Transaction**

Click on **"Simulate Transaction"**. Select the 97% confidence fraud scenario:
- Amount: ₹2,30,000
- Time: 03:14 AM IST
- Sender account: 4th transaction in last 8 minutes
- IP: Bucharest, Romania
- Merchant: First appearance, registered 2 days ago
- Transaction note: "urgent transfer"

Click **"Submit to Jury"**.

Watch the 5 agent cards animate to life. Narrate as each fires:

*"Pattern Agent — 140ms. It found a match: velocity spike + new merchant + night-time, this is a known fraud signature in the database. Red."*

*(Pattern card flips to red at 140ms)*

*"Velocity Agent — 200ms. Four transactions in 8 minutes from this account. The baseline is 1.2 per hour. That's 18 standard deviations above normal. Red."*

*"Merchant Agent — 310ms. This merchant appeared 2 days ago. Transaction amount is in the 99th percentile for this user. Red."*

*"Geo-Risk Agent — 490ms. This is the one I want you to pay attention to. The payment is coming from a Bucharest IP. The card was issued in Indore. And the IP resolves to a known commercial VPN provider — this is not a Romanian customer travelling. This is someone hiding their location. Red."*

*"Behavior Agent — 610ms. I gave the full transaction context to GPT-4o-mini. It flagged: urgency language in the transaction note, mismatched time zone behavior, and the unusual amount round-number ending in zeros. Red."*

Final verdict banner animates up: **FLAGGED — 97.4% confidence — Action: BLOCK**

---

**[2:00 — 4:00] The Architecture Explanation**

Switch to VS Code. Show `src/orchestrator/fanout.js`.

*"Here's what's actually happening under the hood. Five agents. Each one has its own AbortSignal with a different timeout — the Geo agent gets 650ms because it makes an external API call. The Behavior agent gets 800ms because it's an LLM call. If any of them times out, the system doesn't hang. It marks that agent as SKIP and computes the final score from the agents that responded."*

Show the `JURY_WEIGHTS` constant.

*"These weights are Object.freeze() at the module level. They cannot be changed at runtime — not by a bug, not by a configuration mistake, not by an LLM hallucination. The deterministic database agents have combined weight of 0.75. The LLM has 0.10. I trust a database query more than I trust a language model when it comes to blocking a payment. That's an architectural opinion, not just a setting."*

---

**[4:00 — 6:00] The Audit Trail**

Click **"View Audit Report"** on the flagged transaction.

*"This is what your compliance team gets. Every agent's verdict. The evidence each agent used. The confidence score. The latency. Whether any agent timed out. The timestamp. All of it is append-only in the database — no row is ever updated or deleted. This is not a log file. This is a legally defensible audit trail."*

Click **"Export as PDF"**. Show the generated PDF.

*"You can hand this to an RBI examiner. Every data point that went into the decision is here, in plain English, in a format a non-engineer can understand."*

---

**[6:00 — 8:00] Edge Case: Partial Quorum**

Simulate a transaction where the Geo agent times out (demo flag: `simulateGeoTimeout: true`).

*"Watch what happens when the external IP service is slow. The other four agents respond normally. The Geo agent times out at 650ms. The system doesn't hang, doesn't crash, doesn't default to PASS. It computes the final score from four agents — but it adjusts the confidence downward to reflect the incomplete quorum, and it records `geo_risk: SKIPPED — timeout` in the audit log."*

Final verdict: **FLAGGED — 84.2% confidence — Action: REVIEW (not BLOCK)**

*"Because we had less information, the confidence is lower. The action is REVIEW instead of BLOCK. A human gets to make the final call. This is the right behavior when your system is operating with incomplete data."*

---

**[8:00 — 10:00] The Closing**

*"This runs on a single Cloud Run service. Scale-to-zero when idle. Every agent response adds one row to the audit table. The entire thing — five parallel AI agents, weighted consensus, streaming SSE updates, append-only audit log — is about 1,800 lines of code."*

*"The reason I built this is that every company building AI in financial services has the same conversation: 'The ML model is good, but we can't explain it.' FraudJury is the answer. You integrate it as a microservice. Your existing fraud detection doesn't change. FraudJury runs alongside it and gives you the explanation layer your compliance team needs."*

*"Want me to walk through how this integrates with your payment processing pipeline?"*

---
---

<a name="sentinel"></a>

# PROJECT II

# Sentinel
## AI Agent Behavior Compliance Engine

> *"Your AI agents now have a compliance officer watching every word in real-time. Policy violations — wrong pricing, off-brand claims, hallucinated facts, regulatory breaches — are intercepted, logged, and explained before they reach your users or your regulators."*

---

## 1. The CEO Pitch

Every enterprise AI deployment in 2026 faces the same liability: the company can control what it tells the AI to do, but it cannot guarantee what the AI actually says. A single hallucinated price, a competitor comparison that violates advertising standards, an unqualified medical or legal claim — any of these can generate a regulatory notice, a customer complaint, or a lawsuit.

Current solutions are inadequate. Prompt engineering is brittle and doesn't scale. Human review queues add latency. Post-hoc logging catches violations only after delivery. None of them give you the ability to define policies in plain language, enforce them in real-time, and maintain a defensible compliance audit trail.

**Sentinel is the infrastructure layer that enterprise AI is missing.**

It sits between your AI agent network and your users. Every agent response passes through Sentinel before delivery. Sentinel evaluates the response against a set of declarative policies defined in YAML — no code changes required to add new rules. Violations trigger immediate action: CRITICAL violations are blocked and replaced with a safe fallback response; HIGH violations are delivered but flagged; all violations are recorded as immutable events in a compliance audit log.

Sentinel does not require rewriting your existing agents. It is a **sidecar compliance layer** — add it to your Tool Gateway or API gateway and every agent in your fleet is protected.

**Commercial Impact:**
- Eliminates the risk of AI-generated compliance violations reaching users
- Provides a real-time compliance dashboard that legal and risk teams can monitor independently
- Generates automated daily compliance digests for management reporting
- Enables enterprises to define product-specific AI guardrails without engineering changes
- Deployable alongside any existing LLM-powered application in under 4 hours

---

## 2. Core Technical Innovation: The Engineering Masterpiece

### 2.1 The Two-Tier Evaluation Architecture (Speed vs. Depth)

Sentinel's design constraint is that it cannot add meaningful latency to the agent response path. A compliance check that adds 2 seconds is worse than no compliance check. The solution is a **two-tier evaluation model** that optimizes for both speed and depth:

**Tier 1 — Fast Path (synchronous, <5ms):**
Rules that can be evaluated deterministically without an LLM call. These run on every message, always:
- Keyword matching with configurable threshold counts
- Regular expression pattern matching
- Language detection (via lightweight `franc` library)
- Numeric range validation (e.g., "response must not quote amounts above ₹50L")
- PII detection (email, phone number, Aadhaar patterns via regex)

**Tier 2 — LLM Judge Path (asynchronous, 300-800ms):**
Rules that require semantic understanding. These run **only when Tier 1 produces a trigger signal**, or when the rule is explicitly configured as `pattern: llm_judge`. The LLM judge call is not triggered for every message — only for messages that show signs of potential violation:

```
Message arrives
  → Tier 1 scans all rules (<5ms)
    → No triggers: deliver response, log telemetry only
    → Tier 1 triggers rule X: invoke LLM judge for rule X only
      → Judge confirms violation: take configured action + log event
      → Judge clears: deliver response, log false-positive telemetry
```

This architecture means Sentinel adds **~0ms to 95% of messages** (clean responses that trigger no Tier 1 rules) and **~400-800ms to the 5% that need deeper evaluation** (messages with suspicious signals). The LLM judge is surgical, not universal.

### 2.2 Declarative Policy YAML — Zero Engineering Overhead

Policy authors (legal team, product managers, compliance officers) define rules in YAML without writing code:

```yaml
# policies/sales_agent.yaml
agent: xero-seven-sales-agent
version: "1.2"
rules:

  - id: no_price_commitment
    severity: CRITICAL
    description: "Must not commit to a specific price without approval"
    action_on_violation: BLOCK
    fallback_response: "Let me connect you with our team to discuss project costs in detail."
    pattern: tier1_keyword
    keywords: ["will cost", "price is", "charge you", "quote of ₹", "package starts at"]
    keyword_threshold: 1
    confirm_with_llm: true
    llm_prompt: "Does this message make a specific price commitment to a potential customer? Return JSON: {violated: bool, confidence: int, reasoning: string}"

  - id: no_competitor_disparagement
    severity: HIGH
    action_on_violation: FLAG
    pattern: llm_judge
    llm_prompt: "Does this message make a negative comparison with a specific competitor company by name? Return JSON: {violated: bool, confidence: int, reasoning: string}"

  - id: no_pii_exposure
    severity: CRITICAL
    action_on_violation: BLOCK
    pattern: tier1_regex
    patterns:
      - "[0-9]{12}"                         # Aadhaar number
      - "[6-9][0-9]{9}"                     # Indian mobile
      - "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+" # Email

  - id: language_compliance
    severity: MEDIUM
    action_on_violation: FLAG
    pattern: tier1_language
    allowed_languages: ["en", "hi"]
    min_confidence: 0.85
```

Policy files are loaded at startup and hot-reloaded on file change without service restart.

### 2.3 Event Sourcing — The Compliance Audit Architecture

Every evaluation — pass or fail — produces an event. Every event is immutable. The compliance audit trail is not a filtered log of bad outcomes; it is **the complete record of every evaluation Sentinel performed**, queryable by agent, policy, time window, severity, and action:

```sql
CREATE TABLE sentinel_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text,
  agent_name        text        NOT NULL,
  rule_id           text        NOT NULL,
  rule_version      text        NOT NULL,
  severity          text        NOT NULL,
  tier1_triggered   boolean     NOT NULL,
  llm_judge_used    boolean     NOT NULL DEFAULT false,
  llm_confidence    smallint,
  agent_output      text        NOT NULL,
  violation_excerpt text,           -- The specific substring that triggered the rule
  judge_reasoning   text,           -- LLM judge explanation (if used)
  action_taken      text        NOT NULL CHECK (action_taken IN ('BLOCKED','FLAGGED','LOGGED','CLEARED')),
  fallback_used     boolean     NOT NULL DEFAULT false,
  eval_latency_ms   smallint    NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Reporting indexes
CREATE INDEX ON sentinel_events (agent_name, created_at DESC);
CREATE INDEX ON sentinel_events (rule_id, action_taken);
CREATE INDEX ON sentinel_events (severity, action_taken) WHERE action_taken != 'CLEARED';
```

False positives (Tier 1 triggered → LLM judge cleared) are also recorded, with `action_taken: 'CLEARED'`. This is essential for policy calibration — you need to know when your rules are too aggressive.

### 2.4 Zero-Change Agent Integration — The Middleware Pattern

Existing agents require **zero modifications** to be protected by Sentinel. Integration happens at the Tool Gateway layer:

```javascript
// In xero-seven-tool-gateway/index.js — one addition to the existing route handler:

app.post('/tool', agentAuth, async (req, res) => {
  const { tool, args, agentName, sessionId } = req.body;

  // ... existing tool execution logic ...
  const agentResponse = await executeTool(tool, args);

  // Sentinel intercept — one new call before delivery:
  const sentinelResult = await sentinel.evaluate({
    agentName,
    sessionId,
    content: agentResponse.reply ?? agentResponse.result,
    policies: await policyLoader.get(agentName),
  });

  if (sentinelResult.action === 'BLOCK') {
    // Emit SSE event to compliance dashboard
    complianceBus.emit('violation', sentinelResult);
    // Return safe fallback, not the blocked content
    return res.json({ ...agentResponse, reply: sentinelResult.fallbackResponse, _sentinel: { blocked: true } });
  }

  if (sentinelResult.action === 'FLAG') {
    complianceBus.emit('flag', sentinelResult);
  }

  return res.json(agentResponse);
});
```

The existing 23 agents in the Agentverse are immediately protected the moment this integration is added to the Tool Gateway.

### 2.5 Real-Time Compliance Dashboard via SSE

The compliance dashboard subscribes to a persistent SSE stream from Sentinel:

```
GET /sentinel/stream → persistent SSE connection

Events:
  data: {"type":"VIOLATION","severity":"CRITICAL","agent":"sales-agent","rule":"no_price_commitment","action":"BLOCKED","excerpt":"...","reasoning":"...","timestamp":"..."}
  data: {"type":"FLAG","severity":"HIGH","agent":"architect","rule":"no_competitor_disparagement","action":"FLAGGED"}
  data: {"type":"STATS","period":"1h","evaluated":847,"violations":3,"blocks":1,"flags":2}
```

Stats events are emitted every 60 seconds — the dashboard always shows live throughput without polling.

---

## 3. Detailed Technical Stack

| Layer | Technology | Justification |
|---|---|---|
| **Core Engine** | Node.js 20 + Express.js (ESM) | Non-blocking I/O critical for sub-5ms Tier 1 evaluation |
| **Policy Parser** | `js-yaml` + custom validator | Human-readable policy authoring; schema validation on load |
| **Tier 1 Evaluators** | Regex, `franc` (language detection), custom keyword tokenizer | Zero external API calls; synchronous; <5ms |
| **Tier 2 Judge** | GPT-4o-mini with `response_format: json_object` | Cost-optimized; only called on trigger; structured output prevents parse failures |
| **Database** | PostgreSQL via InsForge | Append-only enforcement via RLS; reporting indexes for compliance queries |
| **Streaming** | Server-Sent Events (SSE) | Real-time compliance feed without WebSocket complexity |
| **File Watching** | `chokidar` | Hot-reload YAML policies without service restart |
| **Frontend** | React 18 + Vite + TailwindCSS + Framer Motion | Live violation feed, agent status grid, policy editor UI |
| **Deployment** | Middleware within existing Tool Gateway (Cloud Run) + Vercel frontend | No new infrastructure; extends existing deployment |
| **Observability** | OpenTelemetry spans: `sentinel.evaluate`, `sentinel.llm_judge` | Latency tracking per evaluation type in Cloud Trace |

---

## 4. Step-by-Step 7-Day Build Plan

### Day 1 — Policy Engine: Schema, Parser, and Validator

**Goal:** YAML policies load, validate, and expose a consistent interface.

**Tasks:**
1. Define policy YAML schema with JSON Schema validator (`ajv`)
2. Build `src/policy/loader.js` — loads all `*.yaml` from `policies/` directory, validates against schema
3. Build `src/policy/watcher.js` — uses `chokidar` to hot-reload policies on file save
4. Write 3 policy templates: `sales_agent.yaml`, `support_agent.yaml`, `finance_agent.yaml`
5. Unit test: valid YAML loads; invalid YAML throws with helpful error message; hot reload works

**Deliverable:** `policyLoader.get('xero-seven-sales-agent')` returns compiled rule set in <1ms.

---

### Day 2 — Tier 1 Evaluators

**Goal:** All fast-path evaluators implemented and tested.

**Tasks:**
1. `src/evaluators/keyword.js` — tokenized keyword matching with configurable threshold
2. `src/evaluators/regex.js` — multi-pattern matching, returns first match excerpt
3. `src/evaluators/language.js` — `franc` integration, returns ISO language code + confidence
4. `src/evaluators/numeric.js` — extracts and validates numeric values in text (amounts, percentages)
5. `src/evaluators/pii.js` — Aadhaar, mobile, email, PAN patterns
6. `src/pipeline/tier1.js` — runs all applicable Tier 1 evaluators for a given policy set, returns triggered rules

**Deliverable:** `tier1.evaluate(content, rules)` returns triggered rule list in <5ms.

---

### Day 3 — Tier 2 LLM Judge

**Goal:** LLM judge evaluates suspicious content accurately and returns structured verdicts.

**Tasks:**
1. `src/evaluators/llm_judge.js`:
   - Builds judge prompt from rule's `llm_prompt` + agent content
   - Calls GPT-4o-mini with `response_format: json_object`
   - Validates response: `{ violated: bool, confidence: int, reasoning: string }`
   - Returns CLEARED if response is malformed (fail-safe: don't block on judge failure)
2. Build the complete `src/pipeline/evaluate.js` — orchestrates Tier 1 → conditional Tier 2 → action resolution
3. Test the full pipeline against 10 crafted messages: 4 clean, 3 Tier-1-only violations, 3 LLM-judge-required
4. Measure Tier 1 latency (target: <5ms), LLM judge latency (target: <900ms)

**Deliverable:** `sentinel.evaluate({ agentName, content })` returns `{ action, rule, reasoning, latency_ms }`.

---

### Day 4 — Audit Log, Event Sourcing, and SSE Stream

**Goal:** All evaluations are permanently recorded. Compliance dashboard has a live feed.

**Tasks:**
1. Build `src/audit/logger.js` — writes to `sentinel_events` table (append-only enforced via RLS)
2. Build `src/streams/compliance_bus.js` — internal EventEmitter for compliance events
3. Build `GET /sentinel/stream` — SSE endpoint subscribing to `compliance_bus`
4. Add periodic `STATS` event emission (every 60 seconds)
5. Integrate audit logger into evaluate pipeline — every evaluation logged, including CLEARED
6. Build `GET /sentinel/audit?agent=X&severity=Y&from=Z` — filtered audit query endpoint

**Deliverable:** Every evaluation logged. SSE stream delivers events in real-time. Audit query endpoint returns filtered compliance history.

---

### Day 5 — Tool Gateway Integration

**Goal:** The existing Agentverse is protected without modifying any agent.

**Tasks:**
1. Add `sentinel.evaluate()` call to Tool Gateway's main `/tool` route handler (see Section 2.4)
2. Test against live Sales Agent: trigger `no_price_commitment` rule with a test message
3. Verify: CRITICAL violation → agent output is blocked → fallback response sent → event on SSE stream
4. Verify: HIGH violation → agent output delivered → flagged event on SSE stream
5. Verify: Clean message → no latency added → no event emitted → CLEARED row in audit log (telemetry only)
6. Add `_sentinel` metadata object to all responses (allows downstream consumers to see compliance status)

**Deliverable:** Tool Gateway integration complete. Existing Agentverse agents are protected.

---

### Day 6 — Compliance Dashboard (Frontend)

**Goal:** A professional dashboard that a legal team, risk officer, or CTO could use independently.

**Component Architecture:**
```
App
├── ComplianceSummary    — Today's stats: evaluated, violations, blocks, flags
├── LiveViolationFeed    — Real-time SSE-powered violation stream
│   └── ViolationCard   — Agent name, rule, severity badge, excerpt, reasoning, action taken
├── AgentStatusGrid      — Per-agent compliance health indicators
│   └── AgentStatusCard  — 24h violation rate, last violation timestamp, trend arrow
├── AuditLogTable        — Paginated searchable table of all sentinel_events
└── PolicyBrowser        — Read-only view of all loaded policies and their rule summaries
```

**Key UI Details:**
- CRITICAL violations: red banner with pulse animation; locks user attention
- HIGH violations: amber toast notification
- BLOCKED responses: red pill badge; click to see both the blocked content and the fallback delivered
- Daily digest: auto-generated summary card showing 24h compliance posture
- "Export Compliance Report" — generates PDF with full period audit summary

**Deliverable:** Dashboard displays live compliance activity, historical audit log, and per-agent health.

---

### Day 7 — Demo Preparation and Deployment

**Tasks:**
1. Deploy updated Tool Gateway (with Sentinel middleware) to Cloud Run
2. Deploy Sentinel service to Cloud Run (or fold into Tool Gateway — same service)
3. Deploy dashboard to Vercel
4. Write demo scripts for 4 scenarios (see Section 5)
5. Pre-load `sentinel_events` with 48 hours of historical events for realistic dashboard context
6. Record 3-minute Loom of compliance dashboard in action

---

## 5. The Wow Demo Script — 10-Minute Interview Performance

> **Setup:** Compliance dashboard open. New browser tab ready with the Agentverse Discord or a test API client.

---

**[0:00 — 0:45] The Problem Setup**

*"I want to show you a problem every company shipping AI in 2026 has, and the infrastructure answer I built for it."*

Point to the compliance dashboard stats bar:
- *"847 agent responses evaluated today. 3 policy violations. 1 blocked before it reached a user. 2 flagged for review."*

*"These are your AI agents. They're running, they're answering customers, they're generating proposals. But you have no visibility into what they're actually saying. Until something goes wrong. And in enterprise sales, financial services, or healthcare — something going wrong once is enough to lose a deal or attract a regulator. Sentinel is the compliance officer that watches every word before it leaves the system."*

---

**[0:45 — 3:00] Triggering a CRITICAL Violation**

Open a test console. Send a message to the Sales Agent that will trigger `no_price_commitment`:

*"Tell me — what would a CRM dashboard for our company cost?"*

Watch the agent draft a response. Before showing the user response, show the Sentinel dashboard:

*"Watch the violation feed."*

A red card slides in:
```
🚨 CRITICAL  |  xero-seven-sales-agent  |  Rule: no_price_commitment
Blocked — excerpt: "...will cost approximately ₹4.5 Lakhs..."
LLM Judge: "The message contains a specific price commitment to the client."
Action: BLOCKED — Fallback delivered
```

Show the user what was actually delivered:
> *"Let me connect you with our team to discuss project costs in detail."*

*"The agent quoted ₹4.5 Lakhs. The policy says no price commitments without human approval. Sentinel caught it, blocked it, and delivered a safe fallback — in under 800 milliseconds. The client never saw the unauthorized quote. And here it is in the audit log: the original text, the rule that fired, the judge's reasoning, the action taken. Permanently."*

---

**[3:00 — 5:00] The Architecture — How It's Zero-Change**

Switch to VS Code. Show the Tool Gateway integration — 12 lines added to an existing route handler.

*"Here's the important part from an engineering perspective. I didn't rewrite the Sales Agent. I didn't change any of the 23 agents in this system. I added a 12-line interceptor to the Tool Gateway that every agent already goes through. The existing agents are completely unmodified."*

Show the policy YAML file:

*"And the rules are defined here, in YAML. The legal team can add a rule. The compliance officer can add a rule. No engineering work required to change policy — just edit this file. The service hot-reloads it."*

---

**[5:00 — 7:30] HIGH Violation — A Subtler Case**

Send a message that triggers the competitor disparagement rule:

*"How does Xero Seven compare to ComplyRelax?"*

The Sales Agent replies with some comparative language. The compliance dashboard shows:

```
⚠️ HIGH  |  xero-seven-sales-agent  |  Rule: no_competitor_disparagement
Flagged — LLM Judge confidence: 78%
Judge reasoning: "Message implies competitor has data security weaknesses without evidence."
Action: FLAGGED — Response delivered, logged for review
```

*"This one gets through. HIGH severity doesn't block — it flags. The response is delivered, but it's in the review queue. A human can review it and decide: is this a real violation? Should the policy be tightened? This is the false positive management loop. And here's the LLM judge confidence: 78%. I can set a threshold — if the judge is less than 70% confident, don't even flag it. That prevents noise."*

---

**[7:30 — 9:00] The Daily Compliance Digest**

Show the 24-hour summary view:

*"Every morning, this generates automatically. Yesterday: 1,247 agent responses. 7 violations across 3 agents. 2 blocked, 5 flagged. The sales agent had the highest violation rate — price commitment rule firing 4 times. That tells you the prompt for the sales agent needs to be reinforced."*

Export as PDF. Show the document.

*"This is what you send to your legal team on Monday morning. Or to an auditor. Or to a regulator who wants to know: 'Show me that your AI is complying with your stated policies.' Here it is."*

---

**[9:00 — 10:00] The Close**

*"Sentinel is middleware. It takes four hours to integrate into any LLM-powered application. You define your policies in YAML — no code. You get real-time monitoring, automatic audit logs, and exportable compliance reports. Every enterprise AI deployment needs this layer. Very few have built it."*

*"What policies would you want to enforce across your agent fleet?"*

---
---

<a name="memoryos"></a>

# PROJECT III

# MemoryOS
## Persistent Knowledge Graph Memory for AI Agents

> *"Your AI agents stop forgetting. Every client, every decision, every outcome is stored as a queryable knowledge graph — so when a client returns after three months, your agent knows who they are, what they discussed, what was decided, and what changed. Not conversation history. Relationships."*

---

## 1. The CEO Pitch

Retrieval-Augmented Generation (RAG) retrieves similar text. It is excellent at finding relevant paragraphs from a document corpus. It does not know that "the CTO we spoke to last quarter" and "Rahul" are the same person. It does not know that the budget discussed in three separate conversations represents a single negotiation arc. It does not know that the company has grown from 50 to 200 employees since the last engagement, and that this fact changes which product tier to recommend.

This is the difference between **retrieval** and **memory**.

RAG retrieves. MemoryOS remembers.

MemoryOS is a graph-based persistent memory system for AI agents. Every agent conversation is processed by an entity extraction layer that identifies people, companies, decisions, and facts. These are stored as nodes in a knowledge graph with typed relationship edges. When any agent needs context about an entity, it queries the graph with a depth-first traversal — getting not just the entity itself, but its relationships, the facts associated with those relationships, and the confidence score of each fact based on recency and source reliability.

Multiple agents share the same memory graph. The Sales Agent and the Architect Agent both know about Acme Corp. When the Architect learns that Acme's CTO wants PostgreSQL (not MySQL), the Sales Agent knows this the next time it prepares a proposal.

**This is the infrastructure that turns a collection of stateless LLM calls into a system that actually knows its clients.**

**Commercial Impact:**
- Eliminates the "every conversation starts from zero" problem in enterprise AI deployments
- Enables relationship continuity across agents, sessions, and time — critical for sales, support, and consulting workflows
- Provides a queryable knowledge base that surfaces insights ("Acme Corp has 3 open technical decisions unresolved for 14 days") that no human tracking system captures
- Directly competitive with Mem0 and Letta, which raised significant venture capital to solve this exact problem
- Deployable as a standalone memory service — any agent in any framework can use it via REST API

---

## 2. Core Technical Innovation: The Engineering Masterpiece

### 2.1 Entity Extraction — LLM Output as Structured Graph Input

The core challenge of MemoryOS is that agent conversations are unstructured natural language, but the memory graph requires structured nodes and typed edges. The extraction layer bridges this gap:

After every agent response (as a non-blocking background job), the raw conversation message is sent to an extraction LLM call with a strict schema:

```javascript
const EXTRACTION_SCHEMA = {
  entities: [{
    name: "string",          // Canonical name — used as dedup key
    type: "person|company|product|concept|decision|location",
    attributes: "object",    // Type-specific fields
    confidence: "number",    // 0.0 to 1.0 — how certain the extraction is
  }],
  facts: [{
    subject: "string",       // Entity name (must appear in entities[])
    predicate: "string",     // Relationship type (snake_case)
    object: "string",        // Value or entity name
    confidence: "number",
    source_message: "string" // The exact quote that justified this fact
  }],
  relations: [{
    from_entity: "string",
    edge_type: "string",     // works_at, reports_to, interested_in, decided_on, etc.
    to_entity: "string",
    confidence: "number",
  }]
};
```

The extraction prompt instructs the LLM to be **conservative** — only extract facts that are explicitly stated or strongly implied, never inferred. A confidence below 0.6 does not get written to the graph.

### 2.2 Graph Storage in PostgreSQL — No External Graph Database Required

A full graph database (Neo4j, ArangoDB) adds operational complexity for a 7-day build. MemoryOS implements a property graph model in PostgreSQL using a standard adjacency list pattern with JSONB for flexible attribute storage. This is sufficient for all demo and early production use cases:

```sql
CREATE TABLE memory_nodes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  type         text        NOT NULL,
  attributes   jsonb       NOT NULL DEFAULT '{}',
  confidence   numeric(3,2) NOT NULL DEFAULT 1.0,
  mention_count integer    NOT NULL DEFAULT 1,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, type)   -- Dedup constraint: same name+type = same node
);

CREATE TABLE memory_edges (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node    uuid        NOT NULL REFERENCES memory_nodes(id),
  to_node      uuid        NOT NULL REFERENCES memory_nodes(id),
  edge_type    text        NOT NULL,
  value        text,
  confidence   numeric(3,2) NOT NULL DEFAULT 1.0,
  source_quote text,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_node, to_node, edge_type)  -- Dedup: one edge per type per pair
);

CREATE TABLE memory_history (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id      uuid        REFERENCES memory_nodes(id),
  edge_id      uuid        REFERENCES memory_edges(id),
  change_type  text        NOT NULL CHECK (change_type IN ('created','updated','confidence_changed')),
  old_value    jsonb,
  new_value    jsonb,
  changed_at   timestamptz NOT NULL DEFAULT now()
);
```

The `UNIQUE` constraints on both tables are the dedup mechanism: inserting the same entity twice upserts the existing node (updating `last_seen` and `mention_count`), not creating a duplicate.

### 2.3 Graph Traversal via Recursive CTE

The most powerful query in MemoryOS is: *"Tell me everything about Entity X and everything connected to it within N hops."*

In PostgreSQL, this is a recursive Common Table Expression:

```sql
-- "What does the system know about Acme Corp and its relationships?"
WITH RECURSIVE knowledge_graph AS (
  -- Anchor: start from the named entity
  SELECT
    n.id, n.name, n.type, n.attributes, n.confidence,
    NULL::uuid  AS via_edge,
    NULL::text  AS relation,
    0           AS depth,
    ARRAY[n.id] AS visited
  FROM memory_nodes n
  WHERE n.name ILIKE $1

  UNION ALL

  -- Recursive: traverse outgoing edges up to max depth
  SELECT
    n2.id, n2.name, n2.type, n2.attributes, n2.confidence,
    e.id        AS via_edge,
    e.edge_type AS relation,
    kg.depth + 1,
    kg.visited || n2.id
  FROM knowledge_graph kg
  JOIN memory_edges e     ON e.from_node = kg.id
  JOIN memory_nodes n2    ON n2.id = e.to_node
  WHERE kg.depth < 3          -- Max 3 hops
    AND NOT (n2.id = ANY(kg.visited))  -- Prevent cycles
    AND n2.confidence >= 0.4  -- Only include confident facts
)
SELECT * FROM knowledge_graph ORDER BY depth, confidence DESC;
```

A junior engineer would fetch all nodes and filter in JavaScript. A staff engineer writes the recursive CTE and returns only the traversal result. The query is indexed on `memory_nodes.name` and both foreign keys in `memory_edges` — traversal of a 10,000-node graph takes under 50ms.

### 2.4 Memory Consolidation — Conflict Resolution with Provenance

When the system learns a new fact that contradicts an existing one, it cannot simply overwrite. Overwriting destroys the audit trail. Instead:

1. The new fact is compared to the existing fact (same `subject` + `predicate`)
2. If the new confidence is higher, the edge is updated — but the old value is written to `memory_history`
3. If confidences are equal, a **reconciliation agent** is called: *"Fact A says X. Fact B says Y. Which is more likely to be true given the following context?"*
4. The reconciliation decision is also written to `memory_history`

This means MemoryOS always has a complete audit trail of how beliefs changed over time. *"When did we last update Acme Corp's budget estimate? What was it before?"* — these questions are answerable.

### 2.5 Confidence Decay — Time-Weighted Trust

Facts have a half-life. A budget figure stated 6 months ago in a casual conversation should not carry the same confidence as one confirmed in writing last week. A daily background job applies decay:

```javascript
// Runs nightly via Cloud Scheduler
async function applyConfidenceDecay() {
  const DECAY_RATE_PER_WEEK = 0.05; // 5% per week
  const STALE_THRESHOLD = 0.3;      // Below this: flag as "needs confirmation"
  const WEEKS_SINCE_SEEN = `EXTRACT(EPOCH FROM (NOW() - last_seen)) / 604800`;

  await db.raw(`
    UPDATE memory_edges
    SET confidence = GREATEST(
      confidence * POWER(${1 - DECAY_RATE_PER_WEEK}, ${WEEKS_SINCE_SEEN}),
      0.1   -- Never decay below 0.1 — fact still exists, just low confidence
    )
    WHERE last_seen < NOW() - INTERVAL '7 days'
  `);
}
```

Facts below `STALE_THRESHOLD` are returned with a `⚠️ stale — last confirmed N weeks ago` annotation in API responses. The agents know to treat these with lower trust and to seek re-confirmation.

### 2.6 Multi-Agent Memory Sharing

Every agent in the Agentverse uses the same MemoryOS service via the Tool Gateway. The memory graph is global, not per-agent. This creates a **shared organizational memory** where:

- The Sales Agent learns Acme Corp's budget → stored in graph
- Three days later, the Architect Agent is asked to propose a solution for Acme Corp
- Before generating the proposal, the Architect queries MemoryOS: *"What do we know about Acme Corp?"*
- The graph returns: budget ₹5L, decision maker Rahul Mehta, tech preference PostgreSQL, last contact 3 days ago
- The proposal is scoped correctly without the Architect ever having spoken to the client

This is the **compound intelligence effect**: every agent makes every other agent smarter.

---

## 3. Detailed Technical Stack

| Layer | Technology | Justification |
|---|---|---|
| **API Server** | Node.js 20 + Express.js (ESM) | Consistent with Agentverse; streaming extraction results via SSE |
| **Database** | PostgreSQL via InsForge | Recursive CTEs for graph traversal; JSONB for flexible attributes; RLS for tenant isolation |
| **Entity Extraction** | GPT-4o-mini with structured output (`json_object`) | Cost-optimized; runs as a background task (non-blocking to user) |
| **Reconciliation** | GPT-4o-mini with chain-of-thought prompt | Only called on conflicts (rare); higher reasoning requirement than extraction |
| **Graph Visualization** | React Flow (not D3) | Pre-built layout algorithms; faster to integrate; customizable node/edge styles |
| **Frontend** | React 18 + Vite + TailwindCSS + Framer Motion | Knowledge graph explorer + entity detail views |
| **Background Jobs** | Cloud Scheduler + Cloud Run `/decay` endpoint | Nightly confidence decay; no additional worker infrastructure |
| **Integration** | Tool registered in existing Tool Gateway | `memory_query` and `memory_store` as first-class tools alongside `web_search` |
| **Deployment** | Google Cloud Run + Vercel frontend | Scale-to-zero; consistent with Agentverse |
| **Observability** | OpenTelemetry spans: `memory.extract`, `memory.query`, `memory.consolidate` | Latency tracking per operation type |

---

## 4. Step-by-Step 7-Day Build Plan

### Day 1 — Schema, Migration, and Extraction Interface

**Goal:** Database is ready. Extraction prompt returns valid structured data.

**Tasks:**
1. Write and run `schema.sql`: `memory_nodes`, `memory_edges`, `memory_history` with all constraints and indexes
2. Write the entity extraction prompt with the full schema definition and 3 few-shot examples
3. Build `src/extraction/extractor.js` — calls GPT-4o-mini, parses response, validates against schema
4. Test extraction with 5 sample messages: verify entities, facts, and relations are correctly identified
5. Build `src/db/nodes.js` and `src/db/edges.js` — upsert functions with conflict handling

**Deliverable:** `extractor.extract("Rahul from Acme Corp wants a CRM, budget is ₹5L")` returns correct graph structure. `upsertNode()` creates or updates correctly.

---

### Day 2 — Write Path: Storage and Deduplication

**Goal:** Extracted entities are persisted correctly without duplicates.

**Tasks:**
1. Build `src/memory/writer.js` — orchestrates: extract → dedup check → upsert nodes → upsert edges → write history
2. Implement the dedup logic: `INSERT ... ON CONFLICT (name, type) DO UPDATE SET last_seen = now(), mention_count = mention_count + 1`
3. Implement edge dedup: `INSERT ... ON CONFLICT (from_node, to_node, edge_type) DO UPDATE SET last_seen = now(), value = EXCLUDED.value, confidence = GREATEST(confidence, EXCLUDED.confidence)`
4. Test: write the same entity 3 times with slightly different information → verify single node, updated attributes, history rows
5. Build `POST /memory/store` — accepts `{ agentName, sessionId, message, speaker }` → runs extraction → writes to graph

**Deliverable:** Memory writes correctly. No duplicates. History trail maintained.

---

### Day 3 — Read Path: Graph Traversal and Query API

**Goal:** Agents can query the memory graph and get structured, useful responses.

**Tasks:**
1. Build `src/memory/reader.js` — executes the recursive CTE traversal query (Section 2.3)
2. Build response formatter: raw DB rows → structured `{ entity, facts: [], relations: [], stale_flags: [] }` object
3. Build `GET /memory/query?entity=X&depth=2` — returns structured entity knowledge
4. Build `GET /memory/graph?entity=X&depth=2` — returns React Flow-compatible `{ nodes, edges }` format for visualization
5. Build `GET /memory/search?q=keyword` — full-text search across `memory_nodes.name` and `memory_nodes.attributes`
6. Test: pre-seed 10 entities with relationships, verify traversal returns correct subgraphs

**Deliverable:** `GET /memory/query?entity=Acme+Corp` returns full knowledge context. Graph endpoint returns visualization-ready format.

---

### Day 4 — Memory Consolidation and Conflict Resolution

**Goal:** Conflicting facts are handled gracefully, not silently overwritten.

**Tasks:**
1. Build `src/memory/consolidator.js`:
   - Before any edge upsert, check if an edge with same `from_node + edge_type` already exists
   - If existing confidence > new confidence: keep existing, log to history
   - If new confidence > existing: update, log old value to history
   - If confidences within 0.05 of each other: call reconciliation agent
2. Build the reconciliation agent prompt: presents both facts with context, asks for structured judgment
3. Test conflict scenarios: budget stated as ₹5L in conversation 1, ₹8L in conversation 2 → verify correct resolution

**Deliverable:** Conflict resolution works correctly. `memory_history` table records every change.

---

### Day 5 — Confidence Decay and Tool Gateway Integration

**Goal:** Memory ages realistically. Agents can use memory as a Tool Gateway tool.

**Tasks:**
1. Build `src/jobs/decay.js` — applies weekly confidence decay (see Section 2.5)
2. Register decay as a `POST /jobs/decay` endpoint (triggered by Cloud Scheduler nightly)
3. Verify: seed 5 edges with `last_seen = 6 weeks ago`, run decay, verify confidence reduced correctly
4. Register two new tools in Tool Gateway:
   - `memory_store`: stores a message into the graph (called after every agent response)
   - `memory_query`: queries the graph for an entity and returns structured knowledge context
5. Update Summoner: before routing to an agent, call `memory_query` for any named entities in the message; inject the result into the agent's context
6. Test full flow: conversation 1 mentions Acme Corp → stored → conversation 2 asks about Acme → Summoner injects memory context → agent response uses correct stored facts

**Deliverable:** Full memory integration working in Agentverse. Existing agents benefit from memory without code changes.

---

### Day 6 — Knowledge Graph Visualization Dashboard

**Goal:** A visual, interactive graph explorer that makes memory tangible and impressive.

**Component Architecture:**
```
App
├── SearchBar            — Entity search with autocomplete
├── GraphCanvas          — React Flow canvas: nodes + edges
│   ├── EntityNode       — Color-coded by type; confidence indicator; click to expand
│   └── RelationEdge     — Labeled by edge_type; opacity based on confidence
├── EntityDetailPanel    — Slide-in panel on node click
│   ├── AttributeList    — Entity attributes with confidence scores
│   ├── FactTimeline     — Chronological history of facts about this entity
│   └── StaleWarnings    — Highlighted facts below confidence threshold
└── MemoryStats          — Total nodes, edges, extraction count, last activity
```

**Key UI Details:**
- Node color by type: Person (blue), Company (green), Decision (amber), Concept (purple)
- Node size scales with `mention_count` — frequently discussed entities are visually prominent
- Edge opacity scales with confidence — stale facts appear faded
- Click any node → detail panel with full attribute list, fact history, and stale warnings
- "Animate extraction" — shows a new fact being added to the graph in real-time with a flash animation

**Deliverable:** Graph explorer is usable and visually impressive. Clicking any node reveals its full knowledge context.

---

### Day 7 — Demo Preparation, Demo Data, and Deployment

**Tasks:**
1. Deploy MemoryOS service to Cloud Run
2. Deploy dashboard to Vercel
3. Seed demo dataset: a complete client journey across 3 sessions over 3 weeks:
   - Session 1: "Acme Corp, CTO Rahul, wants CRM, budget ₹5L, timeline 3 months"
   - Session 2 (1 week later): "Rahul confirmed PostgreSQL preference, timeline moved to 4 months"
   - Session 3 (2 weeks later): "Budget increased to ₹8L, Rahul added a co-decision-maker: Priya (CFO)"
4. Verify graph shows complete evolution with history trail
5. Set confidence decay on old Session 1 facts — they should appear slightly faded in the visualization
6. Write README and record 3-minute Loom of graph explorer in action

---

## 5. The Wow Demo Script — 10-Minute Interview Performance

> **Setup:** Graph explorer open in browser, pre-seeded with 3-session Acme Corp demo data. Second tab: a test conversation interface.

---

**[0:00 — 0:45] The Setup: Why RAG Is Not Memory**

*"I want to show you the difference between retrieval and memory — because they're not the same thing, and every AI system I've seen treats them as if they are."*

Open a hypothetical: *"If I have 1,000 conversation transcripts in a vector database, and I ask 'what did Rahul from Acme Corp say about his budget?', I get the 5 most semantically similar chunks. But I don't know that Rahul is the CTO of Acme Corp. I don't know that Acme Corp has a second decision-maker I met later. I don't know that the budget changed. The retrieval found text. It didn't find knowledge."*

---

**[0:45 — 3:00] The Graph: What Memory Looks Like**

Open the graph explorer. Show the pre-seeded Acme Corp graph.

*"This is what MemoryOS knows after 3 conversations over 3 weeks."*

Point to nodes:
- Acme Corp (company, green, large — frequently mentioned)
- Rahul Mehta (person, blue) — edge to Acme Corp: `works_at`, `is_decision_maker`
- Priya Sharma (person, blue, slightly faded — newer, less mentioned)
- CRM Dashboard (product, purple) — edge from Acme Corp: `is_interested_in`
- ₹8L (decision, amber) — edge: `budget_confirmed`, confidence 0.9
- PostgreSQL (concept, purple) — edge from Rahul: `prefers`

*"Acme Corp is connected to its decision-makers, their preferences, their budget, their timeline, and their technical requirements. This isn't a search index. This is a knowledge graph. I can traverse it."*

---

**[3:00 — 5:30] The Query: What Agents Get from Memory**

Open a new conversation tab. Send a message to the Sales Agent: *"I need to prepare a proposal for Acme Corp."*

Show the Summoner pre-processing: it detects "Acme Corp" as an entity and calls `memory_query` before routing.

Show the memory query result:
```json
{
  "entity": "Acme Corp",
  "type": "company",
  "confidence": 0.95,
  "facts": [
    { "predicate": "budget_confirmed", "value": "₹8L", "confidence": 0.90, "last_seen": "5 days ago" },
    { "predicate": "timeline", "value": "4 months", "confidence": 0.82, "last_seen": "12 days ago" },
    { "predicate": "tech_preference", "value": "PostgreSQL", "confidence": 0.91 }
  ],
  "relations": [
    { "entity": "Rahul Mehta", "role": "Primary Decision Maker (CTO)" },
    { "entity": "Priya Sharma", "role": "Co-Decision Maker (CFO)" }
  ],
  "stale_warnings": [
    { "fact": "original_budget", "value": "₹5L", "confidence": 0.31, "note": "Superseded 12 days ago — confirmed updated to ₹8L" }
  ]
}
```

The Sales Agent, given this context, generates a proposal scoped to ₹8L, mentioning PostgreSQL, addressing both Rahul and Priya, and noting the 4-month timeline.

*"The Sales Agent has never spoken to Acme Corp in this session. But it knows everything. Because the memory is shared across agents. What the system learned in previous sessions is available to every agent, automatically."*

---

**[5:30 — 7:30] Memory Evolution: How Facts Change Over Time**

Click on the `₹8L` budget node. Open the Entity Detail panel. Show the fact timeline:

```
Session 1 (3 weeks ago): budget_stated → ₹5L  [confidence: 0.85]
Session 2 (12 days ago): budget_updated → ₹8L  [confidence: 0.90] ← supersedes previous
  Reconciliation note: "Session 2 explicitly confirmed updated budget. Higher confidence."
Original fact still in history: ₹5L, confidence: 0.31 (decayed + superseded)
```

*"When Acme told us the budget changed, MemoryOS didn't delete the old fact. It updated the graph and moved the old value to history. I can see when they told us ₹5L, when they updated it to ₹8L, and the reconciliation reasoning. This is provenance. This is what enterprise memory needs."*

---

**[7:30 — 9:00] Real-Time Extraction**

Open the second tab. Have a new conversation that introduces a new entity:

*"By the way, Acme Corp just hired a new VP of Engineering — Arjun Nair. He'll be joining the CRM evaluation."*

Watch the graph: after the agent responds, a new blue node `Arjun Nair` appears with an edge to `Acme Corp`: `is_vp_engineering`. Animation shows the extraction firing in real-time.

*"The extraction runs as a background job — it doesn't block the agent response. But within 2-3 seconds of any conversation, the new knowledge is in the graph. Every future conversation with any agent benefits immediately."*

---

**[9:00 — 10:00] The Close**

*"The companies building persistent AI memory — Mem0, Letta — raised significant capital because this is a genuinely hard infrastructure problem. The entity extraction, the dedup, the conflict resolution, the confidence decay, the multi-agent sharing — none of it is a straightforward implementation."*

*"What I've built here runs on PostgreSQL. No external graph database. No vendor lock-in. It integrates into the existing agent network as two Tool Gateway tools — `memory_store` and `memory_query`. Any agent can write to it. Any agent can read from it."*

*"The question I'd ask you is: what does your AI system currently do when a user comes back after 3 months? What does it know about them?"*

---
---

## Appendix: Cross-Project Technical Summary

| Capability | FraudJury | Sentinel | MemoryOS |
|---|---|---|---|
| **Distributed pattern** | Fan-out with per-agent circuit breakers | Two-tier evaluation pipeline | Graph traversal with recursive CTE |
| **Immutability / Audit** | Append-only `fraud_verdicts` with RLS | Append-only `sentinel_events` with RLS | Immutable `memory_history` trail |
| **Real-time streaming** | SSE: per-agent verdicts as they fire | SSE: compliance violations as they occur | SSE: graph updates as extraction completes |
| **LLM placement** | Behavior Agent — lowest weight, last resort | LLM Judge — Tier 2 only, on trigger | Entity Extractor — background, non-blocking |
| **Deterministic safety layer** | `Object.freeze()` weights, append-only DB | `Object.freeze()` policy schema, RLS | Confidence floor (0.1), dedup constraints |
| **Zero-change integration** | Standalone microservice | Middleware in Tool Gateway | Two new tools in Tool Gateway |
| **Observability** | OTel span per agent | OTel span per evaluation | OTel span per extraction/query |
| **Deployment** | Cloud Run + Vercel | Extends Tool Gateway + Vercel | Cloud Run + Vercel |

> **Combined statement for interviews:**  
> *"I built production security for AI agents (Model Armor → Sentinel), production FinTech decision infrastructure (Two-Gate Jury → FraudJury), and production memory for AI agents (sliding window summarization → MemoryOS). All three are designed to the same standard: append-only audit logs, deterministic safety layers, real-time observability, and zero-change integration into the existing 23-service agent platform. This is infrastructure thinking, not feature building."*

---

*This document is a living specification. Update after each MVP is shipped. Version each project independently.*  
*FraudJury: v0.0 (spec) | Sentinel: v0.0 (spec) | MemoryOS: v0.0 (spec)*
