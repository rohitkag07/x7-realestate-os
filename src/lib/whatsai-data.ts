import 'server-only';

import { serviceClientOrNull } from '@/lib/sales-server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_BUILDER_ID } from '@/lib/sales-data';
import type { AiMode, Appointment, Business, ConversationStage, ConversationContact, ConversationMessage, ConversationStatus, ConversationThread, HandoffEvent, Lead, LeadQualificationAnswer } from '@/types/database';

export type WhatsAiReadSource = 'supabase' | 'demo' | 'error';

export type WhatsAiThread = {
  id: string;
  phone: string;
  contactName: string;
  leadId: string | null;
  builderId: string;
  businessId: string | null;
  contactId: string | null;
  stage: ConversationStage;
  temperature: Lead['temperature'];
  assignedTo: string | null;
  assignedUserId: string | null;
  tags: string[];
  unreadCount: number;
  inboundCount: number;
  outboundCount: number;
  lastMessageAt: string;
  lastBody: string;
  status: ConversationStatus;
  aiMode: AiMode;
  summary: string | null;
  internalNote: string;
  handoffReason: string | null;
  qualification: {
    answered: number;
    total: number;
    nextQuestion: string | null;
    qualified: boolean;
  };
  appointment: {
    id: string;
    status: Appointment['status'];
    scheduledAt: string;
    type: Appointment['appointment_type'];
    title: string;
  } | null;
  hotHandoff: {
    id: string;
    reason: string;
    priority: string;
    status: string;
  } | null;
};

export type WhatsAiMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: ConversationMessage['status'];
  messageType: ConversationMessage['message_type'];
  agent: string | null;
  createdAt: string;
  authorType: 'customer' | 'ai' | 'human' | 'system';
};

export type WhatsAiBusinessSummary = {
  business: Pick<Business, 'id' | 'name' | 'category' | 'status' | 'plan' | 'trial_ends_at' | 'daily_message_limit'> | null;
  metrics: {
    totalThreads: number;
    unreadThreads: number;
    hotThreads: number;
    inboundToday: number;
    outboundToday: number;
    humanHandoffs: number;
    aiPausedThreads: number;
  };
};

export type WhatsAiInboxData = {
  source: WhatsAiReadSource;
  error: string | null;
  summary: WhatsAiBusinessSummary;
  threads: WhatsAiThread[];
  selectedThread: WhatsAiThread | null;
  messages: WhatsAiMessage[];
};

type CanonicalInboxInput = {
  source: WhatsAiReadSource;
  error?: string | null;
  threads: ConversationThread[];
  messages: ConversationMessage[];
  contacts: ConversationContact[];
  leads: Lead[];
  qualificationAnswers: LeadQualificationAnswer[];
  appointments: Appointment[];
  handoffs: HandoffEvent[];
  business: WhatsAiBusinessSummary['business'];
  humanHandoffs: number;
  selectedPhone?: string | null;
};

const now = new Date();

export async function loadWhatsAiInboxData(selectedPhone?: string | null): Promise<WhatsAiInboxData> {
  const client = await getReadClientOrNull();
  if (!client) return buildDemoInbox(selectedPhone);

  const [threadsResult, messagesResult, contactsResult, leadsResult, qualificationResult, appointmentsResult, businessResult, handoffsResult] = await Promise.all([
    (client.from('conversation_threads') as any).select('*').order('last_message_at', { ascending: false, nullsFirst: false }).limit(200),
    (client.from('conversation_messages') as any).select('*').order('created_at', { ascending: false }).limit(1000),
    (client.from('conversation_contacts') as any).select('*').order('last_message_at', { ascending: false, nullsFirst: false }).limit(500),
    (client.from('leads') as any).select('*').order('created_at', { ascending: false }).limit(300),
    (client.from('lead_qualification_answers') as any).select('*').order('extracted_at', { ascending: false }).limit(1000),
    (client.from('appointments') as any).select('*').order('scheduled_at', { ascending: false }).limit(300),
    (client.from('businesses') as any).select('id,name,category,status,plan,trial_ends_at,daily_message_limit').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    (client.from('handoff_events') as any).select('*').in('status', ['open', 'pending']).limit(200),
  ]);

  const fatalError = threadsResult.error || messagesResult.error || contactsResult.error || leadsResult.error;
  if (fatalError) {
    return buildCanonicalInbox({
      source: 'error',
      error: fatalError.message ?? 'Supabase canonical conversation fetch failed.',
      threads: [],
      messages: [],
      contacts: [],
      leads: [],
      qualificationAnswers: [],
      appointments: [],
      handoffs: [],
      business: null,
      humanHandoffs: 0,
      selectedPhone,
    });
  }

  return buildCanonicalInbox({
    source: 'supabase',
    threads: (threadsResult.data ?? []) as ConversationThread[],
    messages: (messagesResult.data ?? []) as ConversationMessage[],
    contacts: (contactsResult.data ?? []) as ConversationContact[],
    leads: (leadsResult.data ?? []) as Lead[],
    qualificationAnswers: qualificationResult.error ? [] : ((qualificationResult.data ?? []) as LeadQualificationAnswer[]),
    appointments: appointmentsResult.error ? [] : ((appointmentsResult.data ?? []) as Appointment[]),
    handoffs: handoffsResult.error ? [] : ((handoffsResult.data ?? []) as HandoffEvent[]),
    business: businessResult.error ? null : (businessResult.data ?? null),
    humanHandoffs: handoffsResult.error ? 0 : (handoffsResult.data ?? []).length,
    selectedPhone,
  });
}

function buildCanonicalInbox({ source, error = null, threads, messages, contacts, leads, qualificationAnswers, appointments, handoffs, business, humanHandoffs, selectedPhone }: CanonicalInboxInput): WhatsAiInboxData {
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const messagesByThread = new Map<string, ConversationMessage[]>();
  const qualificationsByThread = groupBy(qualificationAnswers, 'thread_id');
  const appointmentsByThread = groupBy(
    appointments.filter((appointment) => appointment.thread_id),
    'thread_id',
  );
  const handoffsByThread = groupBy(
    handoffs.filter((handoff) => handoff.thread_id),
    'thread_id',
  );

  for (const message of messages) {
    if (!message.thread_id) continue;
    messagesByThread.set(message.thread_id, [...(messagesByThread.get(message.thread_id) ?? []), message]);
  }

  const mappedThreads = threads.map((thread) => buildCanonicalThread(thread, messagesByThread.get(thread.id) ?? [], contactsById, leadsById, business?.id ?? thread.business_id ?? null, qualificationsByThread.get(thread.id) ?? [], appointmentsByThread.get(thread.id) ?? [], handoffsByThread.get(thread.id) ?? [])).sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));

  const selected = pickSelectedThread(mappedThreads, selectedPhone);
  const selectedMessages = selected ? (messagesByThread.get(selected.id) ?? []).sort((left, right) => left.created_at.localeCompare(right.created_at)).map(mapCanonicalMessage) : [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    source,
    error,
    summary: {
      business,
      metrics: {
        totalThreads: mappedThreads.length,
        unreadThreads: mappedThreads.filter((thread) => thread.unreadCount > 0).length,
        hotThreads: mappedThreads.filter((thread) => thread.temperature === 'hot').length,
        inboundToday: messages.filter((message) => message.direction === 'inbound' && message.created_at.startsWith(today)).length,
        outboundToday: messages.filter((message) => message.direction === 'outbound' && message.created_at.startsWith(today)).length,
        humanHandoffs,
        aiPausedThreads: mappedThreads.filter((thread) => thread.aiMode === 'manual' || thread.aiMode === 'paused').length,
      },
    },
    threads: mappedThreads,
    selectedThread: selected,
    messages: selectedMessages,
  };
}

function buildCanonicalThread(thread: ConversationThread, rows: ConversationMessage[], contactsById: Map<string, ConversationContact>, leadsById: Map<string, Lead>, businessId: string | null, qualificationRows: LeadQualificationAnswer[], appointmentRows: Appointment[], handoffRows: HandoffEvent[]): WhatsAiThread {
  const sorted = [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const last = sorted[0];
  const contact = thread.contact_id ? (contactsById.get(thread.contact_id) ?? null) : null;
  const lead = (thread.lead_id ? leadsById.get(thread.lead_id) : null) ?? (contact?.lead_id ? leadsById.get(contact.lead_id) : null) ?? null;
  const inboundCount = rows.filter((row) => row.direction === 'inbound').length;
  const outboundCount = rows.filter((row) => row.direction === 'outbound').length;
  const lastBody = last?.body ?? thread.summary ?? 'No messages yet';
  const phone = contact?.phone ?? lead?.phone ?? 'unknown';
  const metadata = asRecord(thread.metadata);
  const contactMetadata = asRecord(contact?.metadata);
  const metadataQualification = asRecord(metadata.qualification_step);
  const metadataAppointment = asRecord(metadata.appointment_status);
  const metadataHandoff = asRecord(metadata.hot_handoff);
  const latestAppointment = [...appointmentRows].sort((left, right) => right.scheduled_at.localeCompare(left.scheduled_at))[0] ?? null;
  const latestHandoff = [...handoffRows].sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;
  const qualificationTotal = numberValue(metadataQualification.total) || Math.max(qualificationRows.length, 4);
  const qualificationAnswered = numberValue(metadataQualification.answered) || qualificationRows.length;

  return {
    id: thread.id,
    phone,
    contactName: contact?.name ?? lead?.name ?? (phone === 'unknown' ? 'WhatsApp Contact' : `WhatsApp ${phone.slice(-4)}`),
    leadId: thread.lead_id ?? contact?.lead_id ?? lead?.id ?? null,
    builderId: thread.builder_id ?? contact?.builder_id ?? lead?.builder_id ?? DEMO_BUILDER_ID,
    businessId: thread.business_id ?? contact?.business_id ?? businessId,
    contactId: thread.contact_id ?? contact?.id ?? null,
    stage: thread.stage ?? contact?.stage ?? stageFromLegacyLead(lead?.lead_stage),
    temperature: lead?.temperature ?? contact?.temperature ?? (thread.unread_count > 0 ? 'warm' : 'cold'),
    assignedTo: thread.assigned_to ?? lead?.assigned_to ?? null,
    assignedUserId: thread.assigned_user_id ?? null,
    tags: [lead?.source ?? contact?.source ?? 'whatsapp', lead?.budget_range ?? null, thread.status === 'pending_human' || thread.ai_mode === 'manual' || thread.ai_mode === 'paused' ? 'human-control' : null, ...(Array.isArray(contact?.tags) ? contact.tags : [])].filter(Boolean) as string[],
    unreadCount: thread.unread_count ?? 0,
    inboundCount,
    outboundCount,
    lastMessageAt: thread.last_message_at ?? last?.created_at ?? thread.created_at,
    lastBody,
    status: thread.status,
    aiMode: thread.ai_mode,
    summary: thread.summary,
    internalNote: stringValue(metadata.internal_note ?? contactMetadata.internal_note),
    handoffReason: stringValue(metadata.handoff_reason ?? latestHandoff?.reason ?? metadataHandoff.reason),
    qualification: {
      answered: qualificationAnswered,
      total: qualificationTotal,
      nextQuestion: stringValue(metadataQualification.next_question),
      qualified: Boolean(metadataQualification.qualified) || qualificationAnswered >= Math.min(qualificationTotal, 3),
    },
    appointment: latestAppointment
      ? {
          id: latestAppointment.id,
          status: latestAppointment.status,
          scheduledAt: latestAppointment.scheduled_at,
          type: latestAppointment.appointment_type,
          title: latestAppointment.title,
        }
      : metadataAppointment.id
        ? {
            id: stringValue(metadataAppointment.id) || 'metadata-appointment',
            status: (stringValue(metadataAppointment.status) || 'scheduled') as Appointment['status'],
            scheduledAt: stringValue(metadataAppointment.scheduled_at) || thread.last_message_at || thread.created_at,
            type: (stringValue(metadataAppointment.type) || 'site_visit') as Appointment['appointment_type'],
            title: 'Appointment',
          }
        : null,
    hotHandoff: latestHandoff
      ? {
          id: latestHandoff.id,
          reason: latestHandoff.reason,
          priority: latestHandoff.priority,
          status: latestHandoff.status,
        }
      : metadataHandoff.id
        ? {
            id: stringValue(metadataHandoff.id) || 'metadata-handoff',
            reason: stringValue(metadataHandoff.reason) || 'Hot lead needs handoff',
            priority: stringValue(metadataHandoff.priority) || 'high',
            status: stringValue(metadataHandoff.status) || 'pending',
          }
        : null,
  };
}

function mapCanonicalMessage(message: ConversationMessage): WhatsAiMessage {
  return {
    id: message.id,
    direction: message.direction,
    body: message.body ?? `[${message.message_type}]`,
    status: message.status,
    messageType: message.message_type,
    agent: message.agent,
    createdAt: message.created_at,
    authorType: detectAuthorType(message),
  };
}

export function buildOwnerSummaryText(data: WhatsAiInboxData) {
  const { metrics } = data.summary;
  const hot = data.threads
    .filter((thread) => thread.temperature === 'hot')
    .slice(0, 3)
    .map((thread) => `- ${thread.contactName} (${thread.phone}): ${thread.lastBody.slice(0, 90)}`)
    .join('\n');

  return ['WhatsAI Daily Summary', `Total conversations: ${metrics.totalThreads}`, `Unread threads: ${metrics.unreadThreads}`, `Hot leads: ${metrics.hotThreads}`, `AI paused threads: ${metrics.aiPausedThreads}`, `Inbound today: ${metrics.inboundToday}`, `Outbound today: ${metrics.outboundToday}`, hot ? `\nTop hot leads:\n${hot}` : '\nTop hot leads: none right now'].join('\n');
}

async function getReadClientOrNull(): Promise<any> {
  const serviceClient = serviceClientOrNull();
  if (serviceClient) return serviceClient;

  try {
    return await createClient();
  } catch {
    return null;
  }
}

function buildDemoInbox(selectedPhone?: string | null) {
  const business: WhatsAiBusinessSummary['business'] = {
    id: 'demo-whatsai-business',
    name: 'Shree Krishna Developers',
    category: 'real_estate',
    status: 'trial',
    plan: 'trial',
    trial_ends_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    daily_message_limit: 500,
  };

  const contactA = makeDemoContact('demo-contact-1', '+919811112201', 'Rajesh Sharma', 'hot', ['meta_ad', '25-40L']);
  const contactB = makeDemoContact('demo-contact-2', '+919811112203', 'Sunil Yadav', 'hot', ['google_ad', '40L+']);
  const contactC = makeDemoContact('demo-contact-3', '+919811112206', 'Manisha Kulkarni', 'hot', ['ghost_closer', '40L+']);

  const threadA = makeDemoThread('demo-thread-1', contactA, 'open', 'assistant', 'Arjun Sales', -44, 'Customer wants Sunday 4 PM visit and location pin.');
  const threadB = makeDemoThread('demo-thread-2', contactB, 'pending_human', 'paused', 'Ritika Closer', -176, 'Needs RERA and price-sheet confirmation before next reply.');
  const threadC = makeDemoThread('demo-thread-3', contactC, 'open', 'manual', 'Owner Desk', -236, 'Adjacent plot hold request needs owner confirmation.');

  const messages = [
    makeDemoConversationMessage('demo-msg-1', threadA, contactA, 'inbound', 'Budget 25-40L hai. Sunday site visit possible hai kya?', -55, 'received', 'summoner-webhook'),
    makeDemoConversationMessage('demo-msg-2', threadA, contactA, 'outbound', 'Rajesh ji, Sunday ke liye 11:00 AM ya 4:00 PM slot hold kar sakta hoon. Kaunsa better rahega?', -52, 'sent', 'sales-agent-qualify'),
    makeDemoConversationMessage('demo-msg-3', threadA, contactA, 'inbound', '4 PM best hai. Location pin bhej do.', -44, 'received', 'summoner-webhook'),
    makeDemoConversationMessage('demo-msg-4', threadB, contactB, 'inbound', 'RERA number aur price sheet bhejiye.', -180, 'received', 'summoner-webhook'),
    makeDemoConversationMessage('demo-msg-5', threadB, contactB, 'outbound', 'Sunil ji, RERA details aur latest price sheet ready hai. Main shortlist bhi share kar raha hoon.', -176, 'delivered', 'sales-agent-follow-up'),
    makeDemoConversationMessage('demo-msg-6', threadC, contactC, 'inbound', 'Do adjacent plots hold kar sakte ho?', -240, 'received', 'summoner-webhook'),
    makeDemoConversationMessage('demo-msg-7', threadC, contactC, 'outbound', 'Manisha ji, 24 hours ke liye hold possible hai. Token steps aur map share kar deta hoon.', -236, 'read', 'whatsai-operator'),
  ];

  return buildCanonicalInbox({
    source: 'demo',
    threads: [threadA, threadB, threadC],
    messages,
    contacts: [contactA, contactB, contactC],
    leads: [],
    qualificationAnswers: [],
    appointments: [],
    handoffs: [],
    business,
    humanHandoffs: 2,
    selectedPhone,
  });
}

function makeDemoContact(id: string, phone: string, name: string, temperature: Lead['temperature'], tags: string[]): ConversationContact {
  const time = new Date(now.getTime() - 44 * 60 * 1000).toISOString();
  return {
    id,
    business_id: 'demo-whatsai-business',
    builder_id: DEMO_BUILDER_ID,
    lead_id: null,
    phone,
    name,
    source: tags[0] ?? 'whatsapp',
    lifecycle_stage: 'lead',
    temperature,
    stage: temperature === 'cold' ? 'cold' : 'new',
    tags,
    last_message_at: time,
    last_handoff_at: null,
    metadata: {},
    created_at: time,
    updated_at: time,
  };
}

function makeDemoThread(id: string, contact: ConversationContact, status: ConversationStatus, aiMode: AiMode, assignedTo: string, minutesAgo: number, summary: string): ConversationThread {
  const time = new Date(now.getTime() + minutesAgo * 60 * 1000).toISOString();
  return {
    id,
    business_id: contact.business_id,
    business_channel_id: null,
    contact_id: contact.id,
    builder_id: contact.builder_id,
    lead_id: null,
    channel: 'whatsapp',
    status,
    assigned_to: assignedTo,
    assigned_user_id: null,
    ai_mode: aiMode,
    stage: contact.stage,
    unread_count: status === 'pending_human' ? 1 : 0,
    last_message_at: time,
    summary,
    metadata: {
      internal_note: status === 'pending_human' ? 'Owner ko price-sheet approval dena hai.' : '',
      handoff_reason: status === 'pending_human' ? 'Pricing/RERA confirmation requested' : null,
      qualification_step: {
        answered: status === 'pending_human' ? 4 : 2,
        total: 5,
        next_question: status === 'pending_human' ? null : 'visit_slot',
        qualified: status === 'pending_human',
      },
      appointment_status:
        status === 'pending_human'
          ? {
              id: `${id}-appointment`,
              status: 'scheduled',
              scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              type: 'site_visit',
            }
          : null,
      hot_handoff:
        status === 'pending_human'
          ? {
              id: `${id}-handoff`,
              reason: 'Qualified hot lead needs owner confirmation',
              priority: 'high',
              status: 'pending',
            }
          : null,
    },
    created_at: time,
    updated_at: time,
  };
}

function makeDemoConversationMessage(id: string, thread: ConversationThread, contact: ConversationContact, direction: 'inbound' | 'outbound', body: string, minutesAgo: number, status: ConversationMessage['status'], agent: string): ConversationMessage {
  const time = new Date(now.getTime() + minutesAgo * 60 * 1000).toISOString();
  return {
    id,
    thread_id: thread.id,
    contact_id: contact.id,
    business_id: contact.business_id,
    builder_id: contact.builder_id,
    lead_id: null,
    whatsapp_message_id: null,
    direction,
    channel: 'whatsapp',
    message_type: 'text',
    body,
    status,
    agent,
    metadata: {},
    created_at: time,
  };
}

function pickSelectedThread(threads: WhatsAiThread[], selectedPhone?: string | null) {
  if (!threads.length || !selectedPhone) return null;
  const key = normalizePhoneKey(selectedPhone);
  return threads.find((thread) => normalizePhoneKey(thread.phone) === key || thread.id === selectedPhone) ?? null;
}

function detectAuthorType(message: ConversationMessage): WhatsAiMessage['authorType'] {
  if (message.direction === 'inbound') return 'customer';
  const agent = String(message.agent ?? '').toLowerCase();
  if (agent.includes('operator') || agent.includes('human') || agent.includes('owner')) return 'human';
  if (agent.includes('system')) return 'system';
  return 'ai';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizePhoneKey(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

function stageFromLegacyLead(stage: Lead['lead_stage'] | undefined): ConversationStage {
  if (stage === 'qualified' || stage === 'visit_scheduled' || stage === 'visited') return 'interested';
  if (stage === 'negotiation') return 'negotiating';
  if (stage === 'booked' || stage === 'lost' || stage === 'new') return stage;
  return 'cold';
}

function groupBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== 'string' || !value) continue;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}
