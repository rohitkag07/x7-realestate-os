import cors from 'cors';
import express from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  buildAssistantResponse, buildHandoffResponse, buildFallbackResponse,
  checkMandatoryHandoff, RESPONSE_TYPES,
} from './assistant-contract.js';
import { findKeywordReply } from './keyword-engine.js';
import { fetchActivePlaybook, PlaybookStoreError } from './playbook-store.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const agentSecret = process.env.AGENT_SECRET || '';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || '';
const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
const whatsappGraphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const metaAppSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET || '';
const metaAccessToken = process.env.META_ACCESS_TOKEN || '';
const metaAdAccountId = process.env.META_AD_ACCOUNT_ID || '';
const defaultBuilderId = process.env.DEFAULT_BUILDER_ID || '';
const defaultProjectId = process.env.DEFAULT_PROJECT_ID || '';
const summonerUrl = (process.env.SUMMONER_URL || '').replace(/\/$/, '');
const toolGatewayUrl = (process.env.TOOL_GATEWAY_URL || 'http://127.0.0.1:8081').replace(/\/$/, '');
const dynamicKeywordEngineEnabled = process.env.DYNAMIC_KEYWORD_ENGINE_ENABLED !== 'false';
const supabaseFetchTimeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 8000);

function fetchWithTimeout(input, init = {}) {
  const timeoutSignal = AbortSignal.timeout(supabaseFetchTimeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    })
  : null;
const whatsappReady = Boolean(whatsappPhoneNumberId && whatsappAccessToken);

app.use(cors());
app.use(express.json({
  limit: '1mb',
  verify(req, _res, buf) {
    req.rawBody = buf.toString('utf8');
  },
}));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'x7-re-sales-agent',
    phase: 'phase-2',
    supabase: Boolean(supabase),
    whatsapp: {
      configured: whatsappReady,
      verify_token: Boolean(whatsappVerifyToken),
      signature: Boolean(metaAppSecret),
    },
    time: new Date().toISOString(),
  });
});

app.get('/health/dependencies', async (_req, res) => {
  const graphCheck = whatsappReady
    ? await fetchWhatsAppProfile()
    : { ok: false, reason: 'missing_whatsapp_env' };

  res.json({
    ok: true,
    service: 'x7-re-sales-agent',
    checks: {
      supabase: {
        configured: Boolean(supabase),
      },
      whatsapp_cloud_api: {
        configured: whatsappReady,
        graph_version: whatsappGraphVersion,
        check: graphCheck,
      },
      meta_marketing_api: {
        configured: Boolean(metaAccessToken && metaAdAccountId),
      },
      defaults: {
        default_builder_id: Boolean(defaultBuilderId),
        default_project_id: Boolean(defaultProjectId),
      },
      summoner_proxy: {
        configured: Boolean(summonerUrl),
        url: summonerUrl || null,
      },
    },
    time: new Date().toISOString(),
  });
});

function verifyWhatsAppWebhook(req, res) {
  if (summonerUrl) {
    const url = new URL(`${summonerUrl}/webhooks/whatsapp`);
    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else if (value != null) {
        url.searchParams.set(key, String(value));
      }
    });

    fetch(url.toString())
      .then(async (response) => {
        const body = await response.text();
        res.status(response.status).send(body);
      })
      .catch((error) => {
        res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'summoner_unreachable' });
      });
    return;
  }

  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken === whatsappVerifyToken) {
    return res.status(200).send(String(challenge ?? ''));
  }

  return res.status(403).json({ ok: false, error: 'Webhook verification failed.' });
}

app.get('/webhook', verifyWhatsAppWebhook);
app.get('/webhooks/whatsapp', verifyWhatsAppWebhook);

async function receiveWhatsAppWebhook(req, res) {
  if (summonerUrl) {
    try {
      const response = await fetch(`${summonerUrl}/webhooks/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.header('x-hub-signature-256') ? { 'x-hub-signature-256': req.header('x-hub-signature-256') } : {}),
        },
        body: req.rawBody || JSON.stringify(req.body),
      });

      const payload = await response.text();
      return res.status(response.status).send(payload);
    } catch (error) {
      return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'summoner_unreachable' });
    }
  }

  if (!validateMetaSignature(req)) {
    log('warn', 'webhook_signature_invalid', { path: req.path });
    return res.status(401).json({ ok: false, error: 'Invalid Meta signature.' });
  }

  await handleWhatsAppWebhook(req.body);
  return res.status(200).json({ ok: true });
}

app.post('/webhook', receiveWhatsAppWebhook);
app.post('/webhooks/whatsapp', receiveWhatsAppWebhook);

app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/health/dependencies' || req.path === '/webhook' || req.path === '/webhooks/whatsapp') return next();
  if (!agentSecret) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(500).json({ ok: false, error: 'AGENT_SECRET is not configured.' });
  }

  const headerSecret = req.header('x-agent-secret')
    || req.header('authorization')?.replace(/^Bearer\s+/i, '')
    || '';

  if (headerSecret !== agentSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized agent request.' });
  }
  return next();
});

const qualifySchema = z.object({
  message: z.string().min(2),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
  lead: z.object({
    id: z.string().optional(),
    builder_id: z.string().optional(),
    project_id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  source: z.string().optional(),
  send_via_whatsapp: z.boolean().default(true).optional(),
});

const followUpSchema = z.object({
  lead_id: z.string().optional(),
  builder_id: z.string().optional(),
  project_id: z.string().optional(),
  lead_name: z.string().min(2),
  lead_stage: z.enum(['new', 'qualified', 'visit_scheduled', 'visited', 'negotiation', 'booked', 'lost']),
  budget_range: z.string().optional(),
  purpose: z.string().optional(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
  trigger: z.string().optional(),
  phone: z.string().optional(),
  send_via_whatsapp: z.boolean().default(true).optional(),
});

const bookVisitSchema = z.object({
  lead_id: z.string(),
  builder_id: z.string(),
  project_id: z.string(),
  lead_name: z.string(),
  phone: z.string(),
  scheduled_date: z.string(),
  scheduled_time: z.string(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
  send_via_whatsapp: z.boolean().default(true).optional(),
});

const dripSchema = z.object({
  lead_id: z.string(),
  builder_id: z.string(),
  lead_name: z.string(),
  lead_stage: z.enum(['new', 'qualified', 'visit_scheduled', 'visited', 'negotiation', 'booked', 'lost']),
  project_id: z.string().optional(),
  phone: z.string().optional(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
  schedule_days: z.array(z.number().int().nonnegative()).default([0, 2, 5, 7, 14, 21, 30]).optional(),
});

const dispatchSchema = z.object({
  limit: z.number().int().positive().max(100).default(25).optional(),
});

const brochureSchema = z.object({
  builder_id: z.string().optional(),
  project_id: z.string().optional(),
  lead_id: z.string().optional(),
  phone: z.string(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
});

app.post('/qualify', async (req, res) => {
  const parsed = qualifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { message, lead, locale = 'hi-en' } = parsed.data;
  const lower = message.toLowerCase();
  const intent = inferIntent(lower);
  const nextStage = inferNextStage(intent);

  // -- Generic context forwarded from Summoner (Phase 2+)
  const businessId     = req.body.business_id     ?? lead?.builder_id ?? defaultBuilderId ?? null;
  const threadId       = req.body.thread_id       ?? null;
  const contactId      = req.body.contact_id      ?? null;
  const playbookVertical = req.body.playbook_vertical ?? 'real_estate';

  // -- Mandatory handoff check (vertical guardrails)
  const forcedHandoff = checkMandatoryHandoff(message, playbookVertical);
  if (forcedHandoff) {
    const handoffResp = buildHandoffResponse({
      reason: forcedHandoff,
      priority: 'high',
      vertical: playbookVertical,
      lead_stage: nextStage,
    });
    if (lead?.phone && parsed.data.send_via_whatsapp !== false) {
      await sendWhatsAppText({
        to: lead.phone,
        body: handoffResp.message,
        builderId: lead.builder_id,
        leadId: lead.id,
        projectId: lead.project_id,
        agent: 'sales-agent-qualify-handoff',
      });
    }
    await recordOutboundGeneric({ supabase: supabase, threadId, content: handoffResp.message, metadata: { response_type: RESPONSE_TYPES.HANDOFF } });
    return res.json({ ok: true, ...handoffResp });
  }

  // -- Build reply using existing intent system (real-estate)
  const legacyResponse = buildQualificationReply({ intent, locale, leadName: lead?.name });

  // -- Wrap in assistant response contract
  const contractResponse = buildAssistantResponse({
    type: intent === 'site_visit' || intent === 'booking' ? RESPONSE_TYPES.APPOINTMENT_OFFER : RESPONSE_TYPES.ASK_QUALIFICATION,
    message: legacyResponse.bilingual,
    vertical: playbookVertical,
    confidence: 0.85,
    lead_stage: nextStage,
    next_question: intent === 'qualification' ? 'intent' : null,
  });

  const outbound = lead?.phone && parsed.data.send_via_whatsapp !== false
    ? await sendWhatsAppText({
        to: lead.phone,
        body: contractResponse.message,
        builderId: lead.builder_id,
        leadId: lead.id,
        projectId: lead.project_id,
        agent: 'sales-agent-qualify',
      })
    : { ok: false, skipped: true };

  const brochure = intent === 'brochure' && lead?.phone
    ? await maybeSendBrochureBundle({
        builderId: lead.builder_id,
        leadId: lead.id,
        projectId: lead.project_id,
        phone: lead.phone,
        locale,
      })
    : null;

  // -- Persist answer in generic lead_qualification_answers (if thread context present)
  if (supabase && threadId && intent === 'qualification') {
    try {
      await supabase.from('lead_qualification_answers').insert({
        thread_id: threadId,
        question_key: 'raw_message',
        answer_value: message,
        extracted_at: new Date().toISOString(),
      });
    } catch {
      // non-fatal
    }
  }

  // -- Record response in generic conversation_messages
  await recordOutboundGeneric({ supabase: supabase, threadId, content: contractResponse.message, metadata: { response_type: contractResponse.type } });

  await logAgentRun({
    agent: 'sales-agent',
    action: 'qualify',
    builderId: lead?.builder_id,
    leadId: lead?.id,
    projectId: lead?.project_id,
    input: parsed.data,
    output: { intent, nextStage, contractResponse, outbound, brochure },
  });

  return res.json({
    ok: true,
    intent,
    next_stage: nextStage,
    score_delta: intent === 'site_visit' || intent === 'booking' ? 12 : intent === 'price' ? 8 : 5,
    response: contractResponse,
    outbound,
    brochure,
    actions: recommendedActions(intent),
  });
});

app.post('/follow-up', async (req, res) => {
  const parsed = followUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const response = buildFollowUpReply(payload);
  const outbound = payload.phone && payload.send_via_whatsapp !== false
    ? await sendWhatsAppText({
        to: payload.phone,
        body: response.bilingual,
        builderId: payload.builder_id,
        leadId: payload.lead_id,
        projectId: payload.project_id,
        agent: 'sales-agent-follow-up',
      })
    : { ok: false, skipped: true };

  if (supabase && payload.lead_id && payload.builder_id) {
    await supabase.from('follow_up_queue').upsert({
      builder_id: payload.builder_id,
      lead_id: payload.lead_id,
      step: `manual_followup_${payload.lead_stage}`,
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      payload: {
        locale: payload.locale,
        trigger: payload.trigger || 'manual',
        body: response.bilingual,
      },
    }, { onConflict: 'lead_id,step' });
  }

  await logAgentRun({
    agent: 'sales-agent',
    action: 'follow-up',
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    input: payload,
    output: { response, outbound },
  });

  return res.json({ ok: true, response, outbound });
});

app.post('/book-visit', async (req, res) => {
  const parsed = bookVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  let record = null;

  if (supabase) {
    const insert = await supabase
      .from('site_visits')
      .insert({
        lead_id: payload.lead_id,
        project_id: payload.project_id,
        scheduled_date: payload.scheduled_date,
        scheduled_time: payload.scheduled_time,
        status: 'scheduled',
        follow_up_action: 'Send route map + same-day reminder',
      })
      .select()
      .single();

    if (insert.error) {
      return res.status(500).json({ ok: false, error: insert.error.message });
    }
    record = insert.data;
  }

  const confirmation = bilingual(
    `Site visit ${payload.scheduled_date} ko ${payload.scheduled_time} par schedule kar di gayi hai. Gate location aur reminder aapko WhatsApp par mil jayega.`,
    `Your site visit is scheduled for ${payload.scheduled_date} at ${payload.scheduled_time}. Gate location and reminders will follow on WhatsApp.`,
    payload.locale,
  );
  const reminderSteps = buildVisitReminderSteps(payload);
  const outbound = payload.send_via_whatsapp !== false
    ? await sendWhatsAppText({
        to: payload.phone,
        body: confirmation.bilingual,
        builderId: payload.builder_id,
        leadId: payload.lead_id,
        projectId: payload.project_id,
        agent: 'sales-agent-book-visit',
      })
    : { ok: false, skipped: true };

  if (supabase) {
    await supabase.from('follow_up_queue').upsert(
      reminderSteps.map((step) => ({
        builder_id: payload.builder_id,
        lead_id: payload.lead_id,
        step: `visit_reminder_${step.step}`,
        scheduled_for: step.scheduled_for,
        status: 'pending',
        payload: {
          visit_date: payload.scheduled_date,
          visit_time: payload.scheduled_time,
          body: step.body.bilingual,
        },
      })),
      { onConflict: 'lead_id,step' },
    );
  }

  await logAgentRun({
    agent: 'sales-agent',
    action: 'book-visit',
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    input: payload,
    output: { record, confirmation, reminderSteps, outbound },
  });

  return res.json({
    ok: true,
    visit: record || {
      lead_id: payload.lead_id,
      project_id: payload.project_id,
      scheduled_date: payload.scheduled_date,
      scheduled_time: payload.scheduled_time,
      status: 'scheduled',
    },
    response: confirmation,
    reminder_steps: reminderSteps,
    outbound,
  });
});

app.post('/drip', async (req, res) => {
  const parsed = dripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const steps = (payload.schedule_days || [0, 2, 5, 7, 14, 21, 30]).map((day) => ({
    step: `day_${day}`,
    day,
    body: buildDripMessage(payload, day),
    scheduled_for: futureIso(day),
  }));

  if (supabase) {
    const rows = steps.map((step) => ({
      builder_id: payload.builder_id,
      lead_id: payload.lead_id,
      step: `sales_drip_${payload.lead_stage}_${step.day}`,
      scheduled_for: step.scheduled_for,
      status: 'pending',
      payload: {
        locale: payload.locale,
        body: step.body.bilingual,
      },
    }));
    await supabase.from('follow_up_queue').upsert(rows, { onConflict: 'lead_id,step' });
  }

  await logAgentRun({
    agent: 'sales-agent',
    action: 'drip',
    builderId: payload.builder_id,
    leadId: payload.lead_id,
    projectId: payload.project_id,
    input: payload,
    output: { steps },
  });

  return res.json({ ok: true, steps });
});

app.post('/dispatch-due', async (req, res) => {
  const parsed = dispatchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  if (!supabase) {
    return res.status(400).json({ ok: false, error: 'Supabase is not configured.' });
  }

  if (!whatsappReady) {
    return res.status(400).json({ ok: false, error: 'WhatsApp Cloud API is not configured.' });
  }

  const limit = parsed.data.limit ?? 25;
  const due = await supabase
    .from('follow_up_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (due.error) {
    return res.status(500).json({ ok: false, error: due.error.message });
  }

  const results = [];
  for (const row of due.data ?? []) {
    const lead = row.lead_id ? await getLeadById(row.lead_id) : null;
    const phone = lead?.phone ?? null;
    const body = typeof row.payload?.body === 'string'
      ? row.payload.body
      : row.payload?.body?.bilingual ?? row.payload?.body?.hi ?? row.payload?.body?.en ?? '';

    if (!phone || !body) {
      await supabase.from('follow_up_queue').update({
        status: 'failed',
        attempts: (row.attempts ?? 0) + 1,
        error: 'Missing phone or body payload.',
      }).eq('id', row.id);
      results.push({ id: row.id, ok: false, error: 'missing_phone_or_body' });
      continue;
    }

    const send = await sendWhatsAppText({
      to: phone,
      body,
      builderId: row.builder_id,
      leadId: row.lead_id,
      projectId: lead?.project_id ?? null,
      agent: 'sales-agent-dispatcher',
    });

    await supabase.from('follow_up_queue').update({
      status: send.ok ? 'sent' : 'failed',
      sent_at: send.ok ? new Date().toISOString() : null,
      attempts: (row.attempts ?? 0) + 1,
      error: send.ok ? null : send.error,
    }).eq('id', row.id);

    results.push({ id: row.id, ...send });
  }

  return res.json({ ok: true, dispatched: results.length, results });
});

app.post('/brochure/send', async (req, res) => {
  const parsed = brochureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const brochure = await findBrochureAsset({
    projectId: payload.project_id ?? defaultProjectId,
    locale: payload.locale ?? 'hi-en',
  });

  if (!brochure?.pdf_url) {
    return res.status(404).json({ ok: false, error: 'Brochure asset not found.' });
  }

  const sent = await sendWhatsAppDocument({
    to: payload.phone,
    link: brochure.pdf_url,
    filename: `${brochure.variant ?? 'brochure'}.pdf`,
    caption: payload.locale === 'hi'
      ? 'Latest brochure PDF share kar diya hai.'
      : payload.locale === 'en'
        ? 'The latest brochure PDF has been shared.'
        : 'Latest brochure PDF share kar diya hai.\n\nThe latest brochure PDF has been shared.',
    builderId: payload.builder_id ?? null,
    leadId: payload.lead_id ?? null,
    projectId: payload.project_id ?? defaultProjectId ?? null,
    agent: 'sales-agent-brochure',
  });

  return res.status(sent.ok ? 200 : 502).json({
    ok: sent.ok,
    brochure_url: brochure.pdf_url,
    ...sent,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Generic multi-vertical endpoints (Phase 4 — Playbook System)
// ─────────────────────────────────────────────────────────────────────────────

const playbookRespondSchema = z.object({
  business_id: z.string().uuid(),
  playbook_id: z.string().uuid().optional().nullable(),
  thread_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  phone: z.string().min(8).optional().nullable(),
  message: z.string().min(1).max(4096),
  send_via_whatsapp: z.boolean().default(true).optional(),
});

async function handlePlaybookRespond(req, res) {
  const startedAt = performance.now();
  const parsed = playbookRespondSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }
  if (!dynamicKeywordEngineEnabled) {
    return res.status(503).json({ ok: false, error: 'dynamic_keyword_engine_disabled' });
  }

  const payload = parsed.data;

  if (payload.thread_id && supabase) {
    const { data: thread, error } = await supabase
      .from('conversation_threads')
      .select('business_id, ai_mode, status')
      .eq('id', payload.thread_id)
      .eq('business_id', payload.business_id)
      .maybeSingle();

    if (error) return res.status(502).json({ ok: false, error: error.message });
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found_for_business' });
    if (thread.ai_mode === 'manual' || ['bot_paused', 'human_takeover'].includes(thread.status)) {
      return res.json({ ok: true, skipped: true, reason: 'human_takeover_active' });
    }
  }

  let playbook;
  try {
    playbook = await fetchActivePlaybook({
      supabase,
      businessId: payload.business_id,
      playbookId: payload.playbook_id,
    });
  } catch (error) {
    const status = error instanceof PlaybookStoreError ? error.status : 500;
    return res.status(status).json({ ok: false, error: error instanceof Error ? error.message : 'playbook_load_failed' });
  }

  const forcedHandoff = checkMandatoryHandoff(payload.message, playbook.vertical);
  const match = forcedHandoff ? null : findKeywordReply(payload.message, playbook.keyword_replies);
  const unmatched = !forcedHandoff && !match;
  const handoff = Boolean(forcedHandoff || unmatched || match?.rule.handoff);
  const reply = forcedHandoff
    ? mandatoryHandoffReply(playbook.vertical)
    : match?.rule.reply || playbook.fallback_reply || 'Thank you. A team member will reply shortly.';
  const reason = forcedHandoff || (unmatched ? 'keyword_no_match' : match?.rule.handoff ? 'keyword_handoff' : null);
  const metadata = {
    response_type: handoff ? RESPONSE_TYPES.HANDOFF : RESPONSE_TYPES.ANSWER,
    engine: 'deterministic_keyword_v1',
    business_id: payload.business_id,
    playbook_id: playbook.id,
    playbook_version: playbook.playbook_version,
    rule_id: match?.rule.id ?? null,
    matched_keyword: match?.keyword ?? null,
    match_type: match?.rule.match_type ?? null,
    handoff_reason: reason,
  };

  const outbound = payload.phone && payload.send_via_whatsapp !== false
    ? await sendWhatsAppText({
        to: payload.phone,
        body: reply,
        builderId: payload.business_id,
        leadId: null,
        projectId: null,
        agent: 'dynamic-keyword-engine',
      })
    : { ok: false, skipped: true, reason: 'send_disabled_or_phone_missing' };

  await recordOutboundGeneric({
    supabase,
    businessId: payload.business_id,
    threadId: payload.thread_id,
    content: reply,
    metadata: { ...metadata, decision_latency_ms: Math.round(performance.now() - startedAt) },
  });

  if (handoff) {
    await triggerHandoffEvent({
      supabase,
      businessId: payload.business_id,
      threadId: payload.thread_id,
      reason,
      priority: forcedHandoff ? 'critical' : 'high',
      summary: payload.message,
    });
  }

  const decisionLatencyMs = Math.round(performance.now() - startedAt);
  log('info', 'keyword_decision_completed', {
    business_id: payload.business_id,
    playbook_id: playbook.id,
    playbook_version: playbook.playbook_version,
    rule_id: match?.rule.id ?? null,
    match_type: match?.rule.match_type ?? null,
    outcome: handoff ? 'handoff' : 'reply',
    decision_latency_ms: decisionLatencyMs,
  });

  return res.json({
    ok: true,
    response: {
      message: reply,
      response_type: metadata.response_type,
      handoff,
      matched_rule: match ? { id: match.rule.id, label: match.rule.label, keyword: match.keyword } : null,
      playbook: { id: playbook.id, version: playbook.playbook_version, vertical: playbook.vertical },
    },
    outbound,
    decision_latency_ms: decisionLatencyMs,
  });
}

function mandatoryHandoffReply(vertical) {
  if (vertical === 'clinic') {
    return 'This request needs immediate human attention. For a medical emergency, please contact local emergency services now. Our team has been alerted.';
  }
  return 'This request needs a team member. We have alerted the business owner, who will reply shortly.';
}

app.post('/playbook/respond', handlePlaybookRespond);
app.post('/playbook/qualify', handlePlaybookRespond);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 helpers — persist answers and events
// ─────────────────────────────────────────────────────────────────────────────

async function persistAnswer({ supabase: sb, threadId, businessId, key, answer }) {
  if (!sb || !threadId || !key || !answer) return;
  try {
    await sb.from('lead_qualification_answers').upsert({
      thread_id: threadId,
      question_key: key,
      answer_value: answer,
      extracted_at: new Date().toISOString(),
    }, { onConflict: 'thread_id,question_key' });
  } catch {
    // non-fatal
  }
}

async function incrementBusinessUsage(businessId, field, amount = 1) {
  if (!supabase || !businessId || !['messages_in', 'messages_out', 'handoffs', 'qual_answers'].includes(field)) return;

  const today = new Date().toISOString().split('T')[0];
  try {
    await supabase.from('business_usage').upsert({
      business_id: businessId,
      date: today,
    }, { onConflict: 'business_id,date' });

    const { data, error } = await supabase
      .from('business_usage')
      .select(field)
      .eq('business_id', businessId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    const current = Number(data?.[field] ?? 0);
    const update = {};
    update[field] = current + amount;

    const { error: updateError } = await supabase
      .from('business_usage')
      .update(update)
      .eq('business_id', businessId)
      .eq('date', today);

    if (updateError) throw updateError;
    log('info', 'usage_incremented', { businessId, field, amount });
  } catch (error) {
    log('warn', 'usage_increment_failed', { businessId, field, error: error instanceof Error ? error.message : 'unknown_error' });
  }
}

async function recordOutboundGeneric({ supabase: sb, businessId = null, threadId, content, metadata = {} }) {
  if (!sb || !threadId || !content) return;
  try {
    await sb.from('conversation_messages').insert({
      thread_id: threadId,
      business_id: businessId,
      direction: 'outbound',
      role: 'assistant',
      content,
      body: content,
      channel: 'whatsapp',
      message_type: 'text',
      status: 'sent',
      metadata,
    });
  } catch {
    // non-fatal
  }
}

async function triggerHandoffEvent({ supabase: sb, businessId, threadId, reason, priority = 'high', summary = null }) {
  if (!sb || !businessId || !threadId) return;
  try {
    await sb.from('handoff_events').insert({
      business_id: businessId,
      thread_id: threadId,
      reason,
      priority,
      status: 'pending',
      summary,
    });
  } catch {
    // non-fatal
  }
}

app.listen(port, () => {
  log('info', 'sales-agent-started', { port, supabase: Boolean(supabase) });
});

function inferIntent(message) {
  if (/(visit|site|dekhna|milna|aana)/.test(message)) return 'site_visit';
  if (/(book|token|hold|confirm|payment|upi)/.test(message)) return 'booking';
  if (/(price|rate|budget|cost|lakh|lac)/.test(message)) return 'price';
  if (/(brochure|pdf|details|send|share)/.test(message)) return 'brochure';
  if (/(location|map|distance|area)/.test(message)) return 'location';
  return 'qualification';
}

function inferNextStage(intent) {
  switch (intent) {
    case 'site_visit':
      return 'visit_scheduled';
    case 'booking':
      return 'negotiation';
    case 'price':
    case 'brochure':
    case 'location':
      return 'qualified';
    default:
      return 'new';
  }
}

function recommendedActions(intent) {
  switch (intent) {
    case 'site_visit':
      return ['book-visit', 'send-route-map', 'arm-reminders'];
    case 'booking':
      return ['share-upi-link', 'reserve-plot', 'trigger-closer-call'];
    case 'price':
      return ['share-price-sheet', 'qualify-budget', 'suggest-visit'];
    case 'brochure':
      return ['send-brochure', 'share-rera', 'suggest-visit'];
    default:
      return ['collect-budget', 'collect-timeline', 'keep-chat-warm'];
  }
}

function buildQualificationReply({ intent, locale, leadName }) {
  const opener = leadName ? `${leadName} ji,` : 'Sahab,';
  const hi = {
    site_visit: `${opener} site visit ke liye best. Main aapko 11:00 AM ya 4:00 PM ka slot hold kara sakta hoon. Aapko kaunsa theek rahega?`,
    booking: `${opener} agar aap plot hold karna chahte hain toh main turant token amount aur payment steps share kar deta hoon.`,
    price: `${opener} main latest price sheet aur available inventory abhi share kar deta hoon. Agar aap budget bata dein toh best options short-list kar dunga.`,
    brochure: `${opener} brochure, RERA snapshot, aur location pin ek hi thread mein bhej raha hoon.`,
    location: `${opener} main exact map pin aur nearest landmark breakdown share kar raha hoon.`,
    qualification: `${opener} aapka budget aur timeline samajh kar main best options suggest kar deta hoon. Kya aap self-use ke liye dekh rahe hain ya investment ke liye?`,
  }[intent];
  const en = {
    site_visit: `This looks visit-ready. I can hold a site-visit slot for 11:00 AM or 4:00 PM. Which works better for you?`,
    booking: `If you want to hold a plot, I can immediately share the token amount and payment steps.`,
    price: `I’ll share the latest price sheet and available inventory right away. If you share your budget, I can shortlist the best options.`,
    brochure: `I’m sending the brochure, RERA snapshot, and location pin in one thread.`,
    location: `I’m sharing the exact map pin and nearby-landmark breakdown now.`,
    qualification: `Let me understand your budget and timeline so I can suggest the best options. Is this for self-use or investment?`,
  }[intent];
  return bilingual(hi, en, locale);
}

function buildFollowUpReply(payload) {
  const hiMap = {
    new: `${payload.lead_name} ji, kal jo details maangi thi uske basis par 2 best options ready hain. Agar aap chahein toh aaj hi short WhatsApp call kar lete hain.`,
    qualified: `${payload.lead_name} ji, aapke budget ${payload.budget_range || ''} ke hisaab se best inventory short-list ho gayi hai. Kya main site visit slot block kar doon?`,
    visit_scheduled: `${payload.lead_name} ji, aapki site visit confirm hai. Main route pin, salesperson contact aur gate assist detail bhej raha hoon.`,
    visited: `${payload.lead_name} ji, visit ke baad jo payment-plan discussion hua tha uska summary ready hai. Main abhi share kar raha hoon.`,
    negotiation: `${payload.lead_name} ji, selected plot ko hold rakhne ke liye token window open hai. Agar aap ready hain toh UPI/NEFT details turant share karta hoon.`,
    booked: `${payload.lead_name} ji, token receive ho chuka hai. Agreement draft aur receipt aapko shortly mil jayegi.`,
    lost: `${payload.lead_name} ji, agar aap future mein revisit karna chahein toh updated inventory aur new-launch offers ke saath main hamesha available hoon.`,
  };
  const enMap = {
    new: `Based on your earlier query, I have two strong options ready. If you’d like, we can do a short WhatsApp call today.`,
    qualified: `I’ve shortlisted the best inventory for your budget${payload.budget_range ? ` (${payload.budget_range})` : ''}. Should I block a site-visit slot?`,
    visit_scheduled: `Your site visit is confirmed. I’m sending the route pin, salesperson contact, and gate-assist details now.`,
    visited: `I’ve prepared the payment-plan summary based on your visit discussion and can share it right away.`,
    negotiation: `The token window to hold your selected plot is open. If you’re ready, I can immediately share UPI or NEFT instructions.`,
    booked: `Your token has been received. The agreement draft and receipt will follow shortly.`,
    lost: `If you want to revisit later, I can always share updated inventory and new-launch offers.`,
  };
  return bilingual(hiMap[payload.lead_stage], enMap[payload.lead_stage], payload.locale);
}

function buildDripMessage(payload, day) {
  if (payload.lead_stage === 'new') {
    return bilingual(
      `${payload.lead_name} ji, Day ${day} follow-up: Krishna Greens ki latest inventory aur price movement update ready hai. Agar aap chahein toh main best shortlist bhej deta hoon.`,
      `${payload.lead_name}, Day ${day} follow-up: I have the latest Krishna Greens inventory and pricing movement update ready for you.`,
      payload.locale,
    );
  }

  if (payload.lead_stage === 'qualified') {
    return bilingual(
      `${payload.lead_name} ji, Day ${day} reminder: site visit slot abhi bhi available hai. Aapke budget ke hisaab se best 2 options hold par rakh sakte hain.`,
      `${payload.lead_name}, Day ${day} reminder: the site-visit slot is still available, and I can hold the two best-fit options for your budget.`,
      payload.locale,
    );
  }

  return bilingual(
    `${payload.lead_name} ji, Day ${day} touchpoint: selected inventory aur next action summary aapke liye ready hai. Reply karein, main immediately continue karta hoon.`,
    `${payload.lead_name}, Day ${day} touchpoint: your selected inventory and next-action summary are ready. Reply and I’ll continue immediately.`,
    payload.locale,
  );
}

function buildVisitReminderSteps(payload) {
  return [
    {
      step: 'day_before',
      scheduled_for: visitReminderIso(payload.scheduled_date, payload.scheduled_time, -1, 18, 0),
      body: bilingual(
        `${payload.lead_name} ji, kal aapki site visit ${payload.scheduled_time} par scheduled hai. Main route map aur gate contact aaj shaam tak share kar dunga.`,
        `${payload.lead_name}, your site visit is scheduled for tomorrow at ${payload.scheduled_time}. I’ll share the route map and gate contact by this evening.`,
        payload.locale,
      ),
    },
    {
      step: 'same_day',
      scheduled_for: visitReminderIso(payload.scheduled_date, payload.scheduled_time, 0, 8, 30),
      body: bilingual(
        `${payload.lead_name} ji, aaj aapki site visit ${payload.scheduled_time} par hai. Nikalne se pehle is message par reply kar dein, main gate assist ready rakhunga.`,
        `${payload.lead_name}, your site visit is today at ${payload.scheduled_time}. Reply before you leave and I’ll keep gate assist ready.`,
        payload.locale,
      ),
    },
  ];
}

function bilingual(hi, en, locale = 'hi-en') {
  if (locale === 'hi') return { hi, en, bilingual: hi };
  if (locale === 'en') return { hi, en, bilingual: en };
  return { hi, en, bilingual: `${hi}\n\n${en}` };
}

function validateMetaSignature(req) {
  if (!metaAppSecret) {
    log('warn', 'webhook_signature_secret_missing', { production: process.env.NODE_ENV === 'production' });
    return process.env.NODE_ENV !== 'production';
  }

  const signature = req.header('x-hub-signature-256') || '';
  if (!signature.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', metaAppSecret)
    .update(req.rawBody || '', 'utf8')
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function handleWhatsAppWebhook(payload) {
  const changes = payload?.entry?.flatMap((entry) => entry?.changes || []) || [];

  for (const change of changes) {
    const value = change?.value || {};

    for (const status of value.statuses || []) {
      await updateMessageStatus(status);
    }

    for (const message of value.messages || []) {
      if (message?.from) {
        await handleInboundMessage(message, value);
      }
    }
  }
}

async function handleInboundMessage(message, envelope) {
  const normalizedPhone = normalizePhone(message.from);
  let lead = await findLeadByPhone(normalizedPhone);
  if (!lead && defaultBuilderId) {
    lead = await createLeadFromInboundMessage({
      phone: normalizedPhone,
      builderId: defaultBuilderId,
      projectId: defaultProjectId || null,
      name: `WhatsApp Lead ${normalizedPhone.slice(-4)}`,
    });
  }

  if (lead?.builder_id) {
    await recordWhatsAppMessage({
      builderId: lead.builder_id,
      leadId: lead.id,
      direction: 'inbound',
      phone: normalizedPhone,
      waMessageId: message.id,
      messageType: mapInboundMessageType(message.type),
      body: extractMessageBody(message),
      status: 'received',
      interactivePayload: message.interactive ?? {},
      mediaUrl: null,
      agent: 'sales-agent-webhook',
    });
    await incrementBusinessUsage(lead.builder_id, 'messages_in');
  }

  const body = extractMessageBody(message);
  if (!body) return;

  const locale = 'hi-en';
  const intent = inferIntent(body.toLowerCase());
  const response = buildQualificationReply({ intent, locale, leadName: lead?.name });

  const outbound = await sendWhatsAppText({
    to: normalizedPhone,
    body: response.bilingual,
    builderId: lead?.builder_id ?? defaultBuilderId ?? null,
    leadId: lead?.id ?? null,
    projectId: lead?.project_id ?? defaultProjectId ?? null,
    agent: 'sales-agent-webhook',
  });

  const brochure = intent === 'brochure'
    ? await maybeSendBrochureBundle({
        builderId: lead?.builder_id ?? defaultBuilderId ?? null,
        leadId: lead?.id ?? null,
        projectId: lead?.project_id ?? defaultProjectId ?? null,
        phone: normalizedPhone,
        locale,
      })
    : null;

  await logAgentRun({
    agent: 'sales-agent',
    action: 'webhook-inbound',
    builderId: lead?.builder_id ?? defaultBuilderId ?? null,
    leadId: lead?.id ?? null,
    projectId: lead?.project_id ?? defaultProjectId ?? null,
    input: {
      from: normalizedPhone,
      message_type: message.type,
      body,
      raw: message,
      metadata: envelope?.metadata ?? null,
    },
    output: {
      intent,
      response,
      outbound,
      brochure,
    },
  });
}

async function maybeSendBrochureBundle({ builderId, leadId, projectId, phone, locale }) {
  const brochure = await findBrochureAsset({ projectId, locale });
  if (!brochure?.pdf_url) return { ok: false, skipped: true, reason: 'brochure_missing' };

  return sendWhatsAppDocument({
    to: phone,
    link: brochure.pdf_url,
    filename: `${brochure.variant || 'brochure'}.pdf`,
    caption: locale === 'hi'
      ? 'Latest brochure PDF share kar diya hai.'
      : locale === 'en'
        ? 'The latest brochure PDF has been shared.'
        : 'Latest brochure PDF share kar diya hai.\n\nThe latest brochure PDF has been shared.',
    builderId,
    leadId,
    projectId,
    agent: 'sales-agent-brochure',
  });
}

async function sendWhatsAppText({ to, body, builderId, leadId, projectId, agent }) {
  try {
    const response = await fetch(`${toolGatewayUrl}/whatsapp/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}),
      },
      body: JSON.stringify({
        to: normalizeOutboundPhone(to),
        body,
        business_id: builderId,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    const messageId = payload?.wa_message_id ?? null;

    await recordWhatsAppMessage({
      builderId,
      leadId,
      direction: 'outbound',
      phone: normalizePhone(to),
      waMessageId: messageId,
      messageType: 'text',
      body,
      status: response.ok ? 'sent' : 'failed',
      error: response.ok ? null : payload?.error?.message || 'whatsapp_send_failed',
      agent,
    });

    if (!response.ok) {
      log('error', 'tool_gateway_whatsapp_error', {
        status: response.status,
        message: payload?.error ?? 'whatsapp_send_failed',
      });
    }

    return response.ok
      ? { ok: true, message_id: messageId }
      : { ok: false, error: payload?.error || 'whatsapp_send_failed' };
  } catch (error) {
    await recordWhatsAppMessage({
      builderId,
      leadId,
      direction: 'outbound',
      phone: normalizePhone(to),
      waMessageId: null,
      messageType: 'text',
      body,
      status: 'failed',
      error: error instanceof Error ? error.message : 'whatsapp_send_failed',
      agent,
    });

    return { ok: false, error: error instanceof Error ? error.message : 'whatsapp_send_failed' };
  }
}

async function sendWhatsAppDocument({ to, link, filename, caption, builderId, leadId, projectId, agent }) {
  try {
    const response = await fetch(`${toolGatewayUrl}/whatsapp/send/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}),
      },
      body: JSON.stringify({
        to: normalizeOutboundPhone(to),
        url: link,
        filename,
        caption,
        business_id: builderId,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    const messageId = payload?.wa_message_id ?? null;

    await recordWhatsAppMessage({
      builderId,
      leadId,
      direction: 'outbound',
      phone: normalizePhone(to),
      waMessageId: messageId,
      messageType: 'document',
      body: caption,
      mediaUrl: link,
      status: response.ok ? 'sent' : 'failed',
      error: response.ok ? null : payload?.error || 'whatsapp_document_failed',
      agent,
      projectId,
    });

    if (!response.ok) {
      log('error', 'tool_gateway_whatsapp_document_error', {
        status: response.status,
        message: payload?.error ?? 'whatsapp_document_failed',
      });
    }

    return response.ok
      ? { ok: true, message_id: messageId, media_url: link }
      : { ok: false, error: payload?.error || 'whatsapp_document_failed' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'whatsapp_document_failed' };
  }
}

async function fetchWhatsAppProfile() {
  if (!whatsappReady) return { ok: false, reason: 'missing_whatsapp_env' };

  try {
    const response = await fetch(whatsappGraphUrl('?fields=display_phone_number,verified_name,quality_rating,code_verification_status'), {
      headers: { Authorization: `Bearer ${whatsappAccessToken}` },
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok
      ? { ok: true, profile: payload }
      : { ok: false, error: payload?.error?.message || 'graph_profile_failed' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'graph_profile_failed' };
  }
}

async function findBrochureAsset({ projectId, locale }) {
  if (!supabase || !projectId) return null;

  const brochure = await supabase
    .from('brochure_assets')
    .select('*')
    .eq('project_id', projectId)
    .in('language', [locale, 'hi-en'])
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (brochure.data?.pdf_url) return brochure.data;

  const project = await supabase
    .from('projects')
    .select('name, brochure_url')
    .eq('id', projectId)
    .maybeSingle();

  if (project.data?.brochure_url) {
    return {
      pdf_url: project.data.brochure_url,
      variant: project.data.name || 'project-brochure',
    };
  }

  return null;
}

async function getLeadById(leadId) {
  if (!supabase || !leadId) return null;
  const lead = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
  return lead.data ?? null;
}

async function findLeadByPhone(phone) {
  if (!supabase || !phone) return null;
  const candidates = [phone, normalizePhone(phone), normalizeOutboundPhone(phone)];
  for (const candidate of candidates) {
    const lead = await supabase.from('leads').select('*').eq('phone', candidate).maybeSingle();
    if (lead.data) return lead.data;
  }
  return null;
}

async function createLeadFromInboundMessage({ phone, builderId, projectId, name }) {
  if (!supabase || !builderId) return null;
  const insert = await supabase.from('leads').insert({
    builder_id: builderId,
    project_id: projectId,
    name,
    phone,
    source: 'whatsapp',
    lead_stage: 'new',
    temperature: 'warm',
    lead_score: 36,
    notes: 'Auto-created from WhatsApp webhook.',
    last_contacted_at: new Date().toISOString(),
  }).select().single();
  return insert.data ?? null;
}

async function recordWhatsAppMessage({
  builderId,
  leadId,
  direction,
  phone,
  waMessageId,
  messageType,
  body,
  mediaUrl = null,
  status,
  error = null,
  interactivePayload = {},
  projectId = null,
  agent = 'sales-agent',
}) {
  if (!supabase || !builderId || !phone) return;

  const payload = {
    builder_id: builderId,
    lead_id: leadId || null,
    direction,
    phone,
    wa_message_id: waMessageId,
    message_type: messageType,
    body: body || null,
    media_url: mediaUrl,
    interactive_payload: interactivePayload,
    status,
    error,
    agent,
    template_params: projectId ? [{ project_id: projectId }] : [],
  };

  const { error: insertError } = await supabase.from('whatsapp_messages').insert(payload);
  if (!insertError) return;

  if (waMessageId && insertError.code === '23505') {
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update(payload)
      .eq('wa_message_id', waMessageId);

    if (!updateError) return;
    console.error('[wa_message_update_failed]', waMessageId, updateError.message);
    return;
  }

  if (insertError.code === '23503') {
    return;
  }

  console.error('[wa_message_insert_failed]', waMessageId, insertError.message);
}

async function updateMessageStatus(status) {
  if (!supabase || !status?.id) return;

  await supabase.from('whatsapp_messages').update({
    status: mapMetaStatus(status.status),
    error: status?.errors?.[0]?.title ?? null,
  }).eq('wa_message_id', status.id);
}

function mapInboundMessageType(type) {
  if (type === 'button') return 'button_reply';
  if (type === 'interactive') return 'list_reply';
  return type || 'text';
}

function extractMessageBody(message) {
  if (message?.text?.body) return message.text.body;
  if (message?.button?.text) return message.button.text;
  if (message?.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message?.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  if (message?.image?.caption) return message.image.caption;
  if (message?.document?.caption) return message.document.caption;
  return '';
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function normalizeOutboundPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappGraphUrl(path) {
  return `https://graph.facebook.com/${whatsappGraphVersion}/${whatsappPhoneNumberId}${path}`;
}

function mapMetaStatus(status) {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
    case 'failed':
      return status;
    default:
      return 'sent';
  }
}

async function logAgentRun({ agent, action, builderId, leadId, projectId, input, output }) {
  log('info', action, { agent, builderId, leadId, projectId });
  if (!supabase || !builderId) return;

  await supabase.from('agent_runs').insert({
    builder_id: builderId,
    agent,
    action,
    lead_id: leadId || null,
    project_id: projectId || null,
    input,
    output,
    status: 'success',
  });
}

function futureIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function visitReminderIso(date, time, dayOffset, fallbackHour, fallbackMinute) {
  const reminder = new Date(`${date}T09:00:00`);
  if (Number.isNaN(reminder.getTime())) return futureIso(Math.max(dayOffset, 0));

  const parsed = parseTime(time);
  reminder.setDate(reminder.getDate() + dayOffset);
  reminder.setHours(parsed?.hours ?? fallbackHour, parsed?.minutes ?? fallbackMinute, 0, 0);
  return reminder.toISOString();
}

function parseTime(value) {
  const normalized = String(value || '').trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3];

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

function log(level, event, extra = {}) {
  console.log(JSON.stringify({
    level,
    event,
    service: 'x7-re-sales-agent',
    time: new Date().toISOString(),
    ...extra,
  }));
}
