import 'server-only';

import type { LeadSource } from '@/types/database';

export type LeadFlowInput = {
  businessId?: string | null;
  builderId?: string | null;
  projectId?: string | null;
  businessChannelId?: string | null;
  contactId?: string | null;
  threadId?: string | null;
  leadId?: string | null;
  phone: string;
  name?: string | null;
  source?: LeadSource;
  body?: string | null;
  metaLeadId?: string | null;
  waMessageId?: string | null;
  appointmentAt?: string | null;
  appointmentType?: 'site_visit' | 'clinic_visit' | 'demo' | 'callback' | 'other';
};

export type LeadFlowResult = {
  lead: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  thread: Record<string, unknown> | null;
  qualification: {
    answered: number;
    total: number;
    nextQuestion: string | null;
    qualified: boolean;
    answers: Array<{ key: string; value: string }>;
  };
  appointment: Record<string, unknown> | null;
  handoff: Record<string, unknown> | null;
};

export async function persistLeadToAppointmentFlow(supabase: any, input: LeadFlowInput): Promise<LeadFlowResult> {
  const phone = normalizePhone(input.phone);
  const body = String(input.body ?? '').trim();
  const source = input.source ?? 'whatsapp';
  const businessId = input.businessId ?? await resolveBusinessId(supabase, input.builderId);
  const builderId = input.builderId ?? await resolveBuilderId(supabase, businessId);
  const lead = builderId ? await upsertLead(supabase, {
    ...input,
    builderId,
    projectId: input.projectId ?? null,
    phone,
    source,
    body,
  }) : null;

  const contact = await upsertContact(supabase, {
    businessId,
    builderId,
    leadId: rowId(lead) ?? input.leadId ?? null,
    phone,
    name: input.name ?? stringValue(lead?.name) ?? null,
    source,
  });

  const thread = await upsertThread(supabase, {
    businessId,
    businessChannelId: input.businessChannelId ?? null,
    builderId,
    contactId: rowId(contact) ?? input.contactId ?? null,
    threadId: input.threadId ?? null,
    leadId: rowId(lead) ?? input.leadId ?? null,
  });

  if (thread && body) {
    await insertCanonicalMessage(supabase, {
      thread,
      contact,
      businessId,
      builderId,
      leadId: rowId(lead) ?? input.leadId ?? null,
      body,
      waMessageId: input.waMessageId ?? input.metaLeadId ?? null,
      source,
    });
  }

  const playbook = businessId ? await loadPlaybook(supabase, businessId) : null;
  const questions = normalizeQuestions(playbook?.qualification_questions);
  const extractedAnswers = extractQualificationAnswers(body, questions);
  const qualification = await persistQualificationAnswers(supabase, rowId(thread), questions, extractedAnswers);
  const appointmentAt = input.appointmentAt ?? inferAppointmentAt(body);
  const isHot = qualification.qualified || Boolean(appointmentAt) || /(hot|urgent|book|visit|site|appointment|demo|call)/i.test(body);

  let appointment: Record<string, unknown> | null = null;
  if (appointmentAt && businessId && rowId(contact)) {
    appointment = await createAppointment(supabase, {
      businessId,
      contactId: rowId(contact)!,
      threadId: rowId(thread),
      title: buildAppointmentTitle(input.appointmentType ?? 'site_visit', input.name ?? stringValue(lead?.name) ?? phone),
      appointmentType: input.appointmentType ?? inferAppointmentType(source),
      scheduledAt: appointmentAt,
      notes: body || 'Booked from WhatsAI lead-to-appointment flow.',
    });
  }

  let handoff: Record<string, unknown> | null = null;
  if (isHot && businessId && rowId(thread)) {
    handoff = await createHandoff(supabase, {
      businessId,
      threadId: rowId(thread)!,
      reason: appointment ? 'appointment_booked_hot_lead' : 'qualified_hot_lead',
      priority: appointment ? 'high' : 'medium',
      summary: body || 'Hot lead detected by WhatsAI qualification flow.',
    });
  }

  await updateFlowState(supabase, {
    leadId: rowId(lead) ?? input.leadId ?? null,
    contactId: rowId(contact) ?? input.contactId ?? null,
    threadId: rowId(thread) ?? input.threadId ?? null,
    appointment,
    handoff,
    qualification,
  });

  return { lead, contact, thread, qualification, appointment, handoff };
}

async function resolveBusinessId(supabase: any, builderId?: string | null) {
  if (!builderId) return null;
  const { data } = await (supabase.from('businesses') as any)
    .select('id')
    .eq('id', builderId)
    .maybeSingle();
  return data?.id ?? builderId;
}

async function resolveBuilderId(supabase: any, businessId?: string | null) {
  if (!businessId) return null;
  const { data } = await (supabase.from('builders') as any)
    .select('id')
    .eq('id', businessId)
    .maybeSingle();
  return data?.id ?? businessId;
}

async function upsertLead(supabase: any, input: LeadFlowInput & { builderId: string; projectId: string | null; phone: string; source: LeadSource; body: string }) {
  const existing = input.leadId
    ? await (supabase.from('leads') as any).select('*').eq('id', input.leadId).maybeSingle()
    : await (supabase.from('leads') as any)
        .select('*')
        .eq('builder_id', input.builderId)
        .eq('phone', input.phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const leadScore = scoreLead(input.body, input.appointmentAt);
  const stage = leadScore >= 72 ? 'qualified' : 'new';
  const temperature = leadScore >= 72 ? 'hot' : leadScore >= 45 ? 'warm' : 'cold';
  const values = {
    builder_id: input.builderId,
    project_id: input.projectId,
    name: input.name || existing.data?.name || `WhatsApp Lead ${input.phone.slice(-4)}`,
    phone: input.phone,
    source: input.source,
    lead_stage: existing.data?.lead_stage === 'visit_scheduled' ? 'visit_scheduled' : stage,
    temperature,
    lead_score: Math.max(Number(existing.data?.lead_score ?? 0), leadScore),
    notes: mergeNotes(existing.data?.notes, input.body, input.metaLeadId),
    last_contacted_at: new Date().toISOString(),
  };

  const result = existing.data
    ? await (supabase.from('leads') as any).update(values).eq('id', existing.data.id).select().single()
    : await (supabase.from('leads') as any).insert(values).select().single();

  return result.data ?? existing.data ?? null;
}

async function upsertContact(supabase: any, input: { businessId: string | null; builderId: string | null; leadId: string | null; phone: string; name: string | null; source: string }) {
  const existing = input.businessId
    ? await (supabase.from('conversation_contacts') as any)
        .select('*')
        .eq('business_id', input.businessId)
        .eq('phone', input.phone)
        .maybeSingle()
    : { data: null };

  const values = {
    business_id: input.businessId,
    builder_id: input.builderId,
    lead_id: input.leadId,
    phone: input.phone,
    name: input.name,
    source: input.source,
    lifecycle_stage: 'lead',
    temperature: 'warm',
    last_message_at: new Date().toISOString(),
  };

  const result = existing.data
    ? await (supabase.from('conversation_contacts') as any).update(values).eq('id', existing.data.id).select().single()
    : await (supabase.from('conversation_contacts') as any).insert(values).select().single();

  return result.data ?? existing.data ?? null;
}

async function upsertThread(supabase: any, input: { businessId: string | null; businessChannelId: string | null; builderId: string | null; contactId: string | null; threadId: string | null; leadId: string | null }) {
  if (input.threadId) {
    const update = await (supabase.from('conversation_threads') as any)
      .update({
        business_id: input.businessId,
        business_channel_id: input.businessChannelId,
        builder_id: input.builderId,
        contact_id: input.contactId,
        lead_id: input.leadId,
        channel: 'whatsapp',
        status: 'open',
        last_message_at: new Date().toISOString(),
      })
      .eq('id', input.threadId)
      .select()
      .single();
    if (update.data) return update.data;
  }

  const existing = input.contactId
    ? await (supabase.from('conversation_threads') as any)
        .select('*')
        .eq('contact_id', input.contactId)
        .eq('channel', 'whatsapp')
        .maybeSingle()
    : { data: null };

  const values = {
    business_id: input.businessId,
    business_channel_id: input.businessChannelId,
    builder_id: input.builderId,
    contact_id: input.contactId,
    lead_id: input.leadId,
    channel: 'whatsapp',
    status: 'open',
    ai_mode: 'assistant',
    last_message_at: new Date().toISOString(),
  };

  const result = existing.data
    ? await (supabase.from('conversation_threads') as any).update(values).eq('id', existing.data.id).select().single()
    : await (supabase.from('conversation_threads') as any).insert(values).select().single();

  return result.data ?? existing.data ?? null;
}

async function insertCanonicalMessage(supabase: any, input: { thread: Record<string, unknown>; contact: Record<string, unknown> | null; businessId: string | null; builderId: string | null; leadId: string | null; body: string; waMessageId: string | null; source: string }) {
  const { error } = await (supabase.from('conversation_messages') as any).insert({
    thread_id: rowId(input.thread),
    contact_id: rowId(input.contact),
    business_id: input.businessId,
    builder_id: input.builderId,
    lead_id: input.leadId,
    direction: 'inbound',
    role: 'user',
    channel: 'whatsapp',
    message_type: 'text',
    content: input.body,
    body: input.body,
    status: 'received',
    agent: input.source === 'meta_ad' ? 'meta-lead-intake' : 'whatsai-lead-flow',
    provider_msg_id: input.waMessageId,
  });

  if (error) throw new Error(`conversation_messages insert failed: ${error.message}`);
}

async function loadPlaybook(supabase: any, businessId: string) {
  const { data } = await (supabase.from('assistant_playbooks') as any)
    .select('id,qualification_questions')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function persistQualificationAnswers(supabase: any, threadId: string | null, questions: string[], answers: Array<{ key: string; value: string }>) {
  if (threadId && answers.length) {
    await (supabase.from('lead_qualification_answers') as any).upsert(
      answers.map((answer) => ({
        thread_id: threadId,
        question_key: answer.key,
        answer_value: answer.value,
        confidence: 0.82,
      })),
      { onConflict: 'thread_id,question_key' },
    );
  }

  const existing = threadId
    ? await (supabase.from('lead_qualification_answers') as any).select('question_key,answer_value').eq('thread_id', threadId)
    : { data: [] };

  const allAnswers = new Map<string, string>();
  for (const row of existing.data ?? []) allAnswers.set(String(row.question_key), String(row.answer_value));
  for (const answer of answers) allAnswers.set(answer.key, answer.value);

  const total = questions.length || 4;
  const answered = allAnswers.size;
  const nextQuestion = questions.find((question) => !allAnswers.has(slugify(question))) ?? null;

  return {
    answered,
    total,
    nextQuestion,
    qualified: answered >= Math.min(total, 3),
    answers: Array.from(allAnswers.entries()).map(([key, value]) => ({ key, value })),
  };
}

async function createAppointment(supabase: any, input: { businessId: string; contactId: string; threadId: string | null; title: string; appointmentType: string; scheduledAt: string; notes: string }) {
  const existing = input.threadId
    ? await (supabase.from('appointments') as any)
        .select('*')
        .eq('thread_id', input.threadId)
        .in('status', ['scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const values = {
    business_id: input.businessId,
    contact_id: input.contactId,
    thread_id: input.threadId,
    title: input.title,
    appointment_type: input.appointmentType,
    scheduled_at: input.scheduledAt,
    status: 'scheduled',
    notes: input.notes,
  };

  const result = existing.data
    ? await (supabase.from('appointments') as any).update(values).eq('id', existing.data.id).select().single()
    : await (supabase.from('appointments') as any).insert(values).select().single();

  return result.data ?? existing.data ?? null;
}

async function createHandoff(supabase: any, input: { businessId: string; threadId: string; reason: string; priority: 'medium' | 'high'; summary: string }) {
  const result = await (supabase.from('handoff_events') as any).insert({
    business_id: input.businessId,
    thread_id: input.threadId,
    reason: input.reason,
    priority: input.priority,
    status: 'pending',
    summary: input.summary,
  }).select().single();

  return result.data ?? null;
}

async function updateFlowState(supabase: any, input: { leadId: string | null; contactId: string | null; threadId: string | null; appointment: Record<string, unknown> | null; handoff: Record<string, unknown> | null; qualification: LeadFlowResult['qualification'] }) {
  const metadata = {
    qualification_step: {
      answered: input.qualification.answered,
      total: input.qualification.total,
      next_question: input.qualification.nextQuestion,
      qualified: input.qualification.qualified,
    },
    appointment_status: input.appointment ? {
      id: rowId(input.appointment),
      status: input.appointment.status,
      scheduled_at: input.appointment.scheduled_at,
      type: input.appointment.appointment_type,
    } : null,
    hot_handoff: input.handoff ? {
      id: rowId(input.handoff),
      reason: input.handoff.reason,
      priority: input.handoff.priority,
      status: input.handoff.status,
    } : null,
  };

  if (input.threadId) {
    await (supabase.from('conversation_threads') as any).update({
      status: input.handoff ? 'pending_human' : 'open',
      lead_stage: input.appointment ? 'visit_scheduled' : input.qualification.qualified ? 'qualified' : 'new',
      temperature: input.handoff ? 'hot' : 'warm',
      last_message_at: new Date().toISOString(),
      metadata,
    }).eq('id', input.threadId);
  }

  if (input.contactId) {
    await (supabase.from('conversation_contacts') as any).update({
      lifecycle_stage: input.appointment ? 'appointment' : input.qualification.qualified ? 'qualified' : 'lead',
      temperature: input.handoff ? 'hot' : 'warm',
      last_handoff_at: input.handoff ? new Date().toISOString() : null,
      metadata,
    }).eq('id', input.contactId);
  }

  if (input.leadId) {
    await (supabase.from('leads') as any).update({
      lead_stage: input.appointment ? 'visit_scheduled' : input.qualification.qualified ? 'qualified' : 'new',
      temperature: input.handoff ? 'hot' : 'warm',
      lead_score: input.handoff ? 86 : input.qualification.qualified ? 72 : 45,
      last_contacted_at: new Date().toISOString(),
    }).eq('id', input.leadId);
  }
}

function normalizeQuestions(value: unknown) {
  const fallback = ['budget', 'requirement', 'timeline', 'visit_slot'];
  if (!Array.isArray(value) || !value.length) return fallback;
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      return String(record.key ?? record.question ?? record.label ?? '').trim();
    }
    return '';
  }).filter(Boolean);
}

function extractQualificationAnswers(body: string, questions: string[]) {
  const answers: Array<{ key: string; value: string }> = [];
  const lower = body.toLowerCase();
  if (!body) return answers;

  if (/(budget|lakh|lac|cr|crore|₹|rs|[0-9]+\s*l)/i.test(body)) answers.push({ key: bestQuestionKey(questions, 'budget'), value: body });
  if (/(visit|site|appointment|demo|call|slot|11|4|am|pm|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i.test(body)) answers.push({ key: bestQuestionKey(questions, 'visit_slot'), value: body });
  if (/(self|investment|invest|family|home|clinic|course|gym|service)/i.test(body)) answers.push({ key: bestQuestionKey(questions, 'requirement'), value: body });
  if (/(immediate|urgent|today|tomorrow|week|month|jaldi|asap)/i.test(body) || lower.includes('hot')) answers.push({ key: bestQuestionKey(questions, 'timeline'), value: body });

  if (!answers.length) answers.push({ key: bestQuestionKey(questions, 'requirement'), value: body });
  return uniqueByKey(answers);
}

function bestQuestionKey(questions: string[], fallback: string) {
  const match = questions.find((question) => slugify(question).includes(fallback.split('_')[0]));
  return slugify(match ?? fallback);
}

function inferAppointmentAt(body: string) {
  if (!/(visit|site|appointment|demo|call|slot|11|4|am|pm|tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i.test(body)) return null;
  const date = new Date();
  if (/tomorrow/i.test(body)) date.setDate(date.getDate() + 1);
  else if (!/today/i.test(body)) date.setDate(date.getDate() + 1);

  if (/(4|4:00|4 pm|4pm|16:00)/i.test(body)) date.setHours(16, 0, 0, 0);
  else if (/(11|11:00|11 am|11am)/i.test(body)) date.setHours(11, 0, 0, 0);
  else date.setHours(16, 0, 0, 0);

  return date.toISOString();
}

function inferAppointmentType(source: LeadSource) {
  if (source === 'meta_ad' || source === 'whatsapp') return 'site_visit';
  return 'callback';
}

function buildAppointmentTitle(type: string, name: string) {
  if (type === 'site_visit') return `Site visit with ${name}`;
  if (type === 'clinic_visit') return `Clinic appointment with ${name}`;
  if (type === 'demo') return `Demo with ${name}`;
  return `Appointment with ${name}`;
}

function scoreLead(body: string, appointmentAt?: string | null) {
  let score = 36;
  if (/(budget|lakh|lac|cr|crore|₹|rs)/i.test(body)) score += 14;
  if (/(visit|site|appointment|demo|call|slot)/i.test(body)) score += 22;
  if (/(urgent|today|tomorrow|immediate|book|token)/i.test(body)) score += 18;
  if (appointmentAt) score += 18;
  return Math.min(score, 96);
}

function mergeNotes(existing: string | null | undefined, body?: string | null, metaLeadId?: string | null) {
  const lines = [existing, body ? `WhatsAI intake: ${body}` : null, metaLeadId ? `Meta lead id: ${metaLeadId}` : null].filter(Boolean);
  return Array.from(new Set(lines)).join('\n').slice(0, 2000);
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return value.startsWith('+') ? value : `+${digits}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'requirement';
}

function uniqueByKey(values: Array<{ key: string; value: string }>) {
  return Array.from(new Map(values.map((value) => [value.key, value])).values());
}

function rowId(row: Record<string, unknown> | null | undefined) {
  return typeof row?.id === 'string' ? row.id : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}
