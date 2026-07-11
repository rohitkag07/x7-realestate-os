import 'server-only';

import { serviceClientOrNull } from '@/lib/sales-server';
import { createClient } from '@/lib/supabase/server';
import { demoLeads, DEMO_BUILDER_ID } from '@/lib/sales-data';
import type {
  Business,
  ConversationContact,
  ConversationMessage,
  ConversationThread,
  Lead,
  WhatsappMessage,
} from '@/types/database';

export type WhatsAiReadSource = 'supabase' | 'demo';

export type WhatsAiThread = {
  id: string;
  phone: string;
  contactName: string;
  leadId: string | null;
  builderId: string;
  businessId: string | null;
  stage: Lead['lead_stage'] | 'unknown';
  temperature: Lead['temperature'];
  assignedTo: string | null;
  tags: string[];
  unreadCount: number;
  inboundCount: number;
  outboundCount: number;
  lastMessageAt: string;
  lastBody: string;
  status: 'open' | 'pending_human' | 'automated' | 'resolved' | 'archived';
  aiMode: 'assistant' | 'manual' | 'paused';
};

export type WhatsAiMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: ConversationMessage['status'];
  messageType: ConversationMessage['message_type'];
  agent: string | null;
  createdAt: string;
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
  };
};

export type WhatsAiInboxData = {
  source: WhatsAiReadSource;
  summary: WhatsAiBusinessSummary;
  threads: WhatsAiThread[];
  selectedThread: WhatsAiThread | null;
  messages: WhatsAiMessage[];
};

const now = new Date();

const demoMessages: WhatsappMessage[] = [
  makeDemoMessage('demo-wa-1', demoLeads[0], 'inbound', 'Budget 25-40L hai. Sunday site visit possible hai kya?', -55, 'received', 'summoner-webhook'),
  makeDemoMessage('demo-wa-2', demoLeads[0], 'outbound', 'Rajesh ji, Sunday ke liye 11:00 AM ya 4:00 PM slot hold kar sakta hoon. Kaunsa better rahega?', -52, 'sent', 'sales-agent-qualify'),
  makeDemoMessage('demo-wa-3', demoLeads[0], 'inbound', '4 PM best hai. Location pin bhej do.', -44, 'received', 'summoner-webhook'),
  makeDemoMessage('demo-wa-4', demoLeads[2], 'inbound', 'RERA number aur price sheet bhejiye.', -180, 'received', 'summoner-webhook'),
  makeDemoMessage('demo-wa-5', demoLeads[2], 'outbound', 'Sunil ji, RERA details aur latest price sheet ready hai. Main shortlist bhi share kar raha hoon.', -176, 'delivered', 'sales-agent-follow-up'),
  makeDemoMessage('demo-wa-6', demoLeads[5], 'inbound', 'Do adjacent plots hold kar sakte ho?', -240, 'received', 'summoner-webhook'),
  makeDemoMessage('demo-wa-7', demoLeads[5], 'outbound', 'Manisha ji, 24 hours ke liye hold possible hai. Token steps aur map share kar deta hoon.', -236, 'read', 'sales-agent-qualify'),
];

export async function loadWhatsAiInboxData(selectedPhone?: string | null): Promise<WhatsAiInboxData> {
  const client = await getReadClientOrNull();
  if (!client) return buildDemoInbox(selectedPhone);

  const [threadsResult, messagesResult, contactsResult, leadsResult, businessResult, handoffsResult] = await Promise.all([
    (client.from('conversation_threads') as any)
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200),
    (client.from('conversation_messages') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
    (client.from('conversation_contacts') as any)
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(500),
    (client.from('leads') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300),
    (client.from('businesses') as any)
      .select('id,name,category,status,plan,trial_ends_at,daily_message_limit')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    (client.from('handoff_events') as any)
      .select('id')
      .eq('status', 'open')
      .limit(200),
  ]);

  if (threadsResult.error || messagesResult.error || contactsResult.error || leadsResult.error) return buildDemoInbox(selectedPhone);

  return buildCanonicalInbox({
    source: 'supabase',
    threads: (threadsResult.data ?? []) as ConversationThread[],
    messages: (messagesResult.data ?? []) as ConversationMessage[],
    contacts: (contactsResult.data ?? []) as ConversationContact[],
    leads: (leadsResult.data ?? []) as Lead[],
    business: businessResult.error ? null : businessResult.data ?? null,
    humanHandoffs: handoffsResult.error ? 0 : (handoffsResult.data ?? []).length,
    selectedPhone,
  });
}

function buildCanonicalInbox({
  source,
  threads,
  messages,
  contacts,
  leads,
  business,
  humanHandoffs,
  selectedPhone,
}: {
  source: WhatsAiReadSource;
  threads: ConversationThread[];
  messages: ConversationMessage[];
  contacts: ConversationContact[];
  leads: Lead[];
  business: WhatsAiBusinessSummary['business'];
  humanHandoffs: number;
  selectedPhone?: string | null;
}): WhatsAiInboxData {
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const messagesByThread = new Map<string, ConversationMessage[]>();

  for (const message of messages) {
    if (!message.thread_id) continue;
    messagesByThread.set(message.thread_id, [...(messagesByThread.get(message.thread_id) ?? []), message]);
  }

  const mappedThreads = threads
    .map((thread) => buildCanonicalThread(thread, messagesByThread.get(thread.id) ?? [], contactsById, leadsById, business?.id ?? thread.business_id ?? null))
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));

  const selected = pickSelectedThread(mappedThreads, selectedPhone);
  const selectedMessages = selected
    ? (messagesByThread.get(selected.id) ?? [])
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .map(mapCanonicalMessage)
    : [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    source,
    summary: {
      business,
      metrics: {
        totalThreads: mappedThreads.length,
        unreadThreads: mappedThreads.filter((thread) => thread.unreadCount > 0).length,
        hotThreads: mappedThreads.filter((thread) => thread.temperature === 'hot').length,
        inboundToday: messages.filter((message) => message.direction === 'inbound' && message.created_at.startsWith(today)).length,
        outboundToday: messages.filter((message) => message.direction === 'outbound' && message.created_at.startsWith(today)).length,
        humanHandoffs,
      },
    },
    threads: mappedThreads,
    selectedThread: selected,
    messages: selectedMessages,
  };
}

function buildCanonicalThread(
  thread: ConversationThread,
  rows: ConversationMessage[],
  contactsById: Map<string, ConversationContact>,
  leadsById: Map<string, Lead>,
  businessId: string | null,
): WhatsAiThread {
  const sorted = [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const last = sorted[0];
  const contact = thread.contact_id ? contactsById.get(thread.contact_id) ?? null : null;
  const lead = (thread.lead_id ? leadsById.get(thread.lead_id) : null)
    ?? (contact?.lead_id ? leadsById.get(contact.lead_id) : null)
    ?? null;
  const inboundCount = rows.filter((row) => row.direction === 'inbound').length;
  const outboundCount = rows.filter((row) => row.direction === 'outbound').length;
  const lastBody = last?.body ?? thread.summary ?? 'No messages yet';
  const phone = contact?.phone ?? lead?.phone ?? 'unknown';

  return {
    id: thread.id,
    phone,
    contactName: contact?.name ?? lead?.name ?? (phone === 'unknown' ? 'WhatsApp Contact' : `WhatsApp ${phone.slice(-4)}`),
    leadId: thread.lead_id ?? contact?.lead_id ?? lead?.id ?? null,
    builderId: thread.builder_id ?? contact?.builder_id ?? lead?.builder_id ?? DEMO_BUILDER_ID,
    businessId: thread.business_id ?? contact?.business_id ?? businessId,
    stage: lead?.lead_stage ?? 'unknown',
    temperature: lead?.temperature ?? contact?.temperature ?? (thread.unread_count > 0 ? 'warm' : 'cold'),
    assignedTo: thread.assigned_to ?? lead?.assigned_to ?? null,
    tags: [
      lead?.source ?? contact?.source ?? 'whatsapp',
      lead?.budget_range ?? null,
      thread.status === 'pending_human' || thread.ai_mode === 'manual' ? 'human-review' : null,
    ].filter(Boolean) as string[],
    unreadCount: thread.unread_count ?? 0,
    inboundCount,
    outboundCount,
    lastMessageAt: thread.last_message_at ?? last?.created_at ?? thread.created_at,
    lastBody,
    status: thread.status,
    aiMode: thread.ai_mode,
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
  };
}

export function buildOwnerSummaryText(data: WhatsAiInboxData) {
  const { metrics } = data.summary;
  const hot = data.threads
    .filter((thread) => thread.temperature === 'hot')
    .slice(0, 3)
    .map((thread) => `- ${thread.contactName} (${thread.phone}): ${thread.lastBody.slice(0, 90)}`)
    .join('\n');

  return [
    'WhatsAI Daily Summary',
    `Total conversations: ${metrics.totalThreads}`,
    `Unread threads: ${metrics.unreadThreads}`,
    `Hot leads: ${metrics.hotThreads}`,
    `Inbound today: ${metrics.inboundToday}`,
    `Outbound today: ${metrics.outboundToday}`,
    hot ? `\nTop hot leads:\n${hot}` : '\nTop hot leads: none right now',
  ].join('\n');
}

function buildInbox({
  source,
  messages,
  leads,
  business,
  humanHandoffs,
  selectedPhone,
}: {
  source: WhatsAiReadSource;
  messages: WhatsappMessage[];
  leads: Lead[];
  business: WhatsAiBusinessSummary['business'];
  humanHandoffs: number;
  selectedPhone?: string | null;
}): WhatsAiInboxData {
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const leadsByPhone = new Map(leads.map((lead) => [normalizePhoneKey(lead.phone), lead]));
  const grouped = new Map<string, WhatsappMessage[]>();

  for (const message of messages) {
    const key = normalizePhoneKey(message.phone);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), message]);
  }

  const threads = [...grouped.entries()]
    .map(([phoneKey, rows]) => buildThread(phoneKey, rows, leadsById, leadsByPhone, business?.id ?? null))
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));

  const selected = pickSelectedThread(threads, selectedPhone);
  const selectedMessages = selected
    ? (grouped.get(normalizePhoneKey(selected.phone)) ?? [])
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .map(mapMessage)
    : [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    source,
    summary: {
      business,
      metrics: {
        totalThreads: threads.length,
        unreadThreads: threads.filter((thread) => thread.unreadCount > 0).length,
        hotThreads: threads.filter((thread) => thread.temperature === 'hot').length,
        inboundToday: messages.filter((message) => message.direction === 'inbound' && message.created_at.startsWith(today)).length,
        outboundToday: messages.filter((message) => message.direction === 'outbound' && message.created_at.startsWith(today)).length,
        humanHandoffs,
      },
    },
    threads,
    selectedThread: selected,
    messages: selectedMessages,
  };
}

function buildThread(
  phoneKey: string,
  rows: WhatsappMessage[],
  leadsById: Map<string, Lead>,
  leadsByPhone: Map<string, Lead>,
  businessId: string | null,
): WhatsAiThread {
  const sorted = [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const last = sorted[0];
  const lead = (last.lead_id ? leadsById.get(last.lead_id) : null) ?? leadsByPhone.get(phoneKey) ?? null;
  const inboundCount = rows.filter((row) => row.direction === 'inbound').length;
  const outboundCount = rows.filter((row) => row.direction === 'outbound').length;
  const unreadCount = rows.filter((row) => row.direction === 'inbound' && row.status === 'received').length;
  const needsHuman = /human|owner|call|confused|urgent|angry|complaint/i.test(rows.map((row) => row.body ?? '').join(' '));

  return {
    id: lead?.id ?? phoneKey,
    phone: last.phone,
    contactName: lead?.name ?? `WhatsApp ${last.phone.slice(-4)}`,
    leadId: lead?.id ?? null,
    builderId: last.builder_id ?? lead?.builder_id ?? DEMO_BUILDER_ID,
    businessId,
    stage: lead?.lead_stage ?? 'unknown',
    temperature: lead?.temperature ?? (unreadCount > 0 ? 'warm' : 'cold'),
    assignedTo: lead?.assigned_to ?? null,
    tags: [
      lead?.source ?? 'whatsapp',
      lead?.budget_range ?? null,
      needsHuman ? 'human-review' : null,
    ].filter(Boolean) as string[],
    unreadCount,
    inboundCount,
    outboundCount,
    lastMessageAt: last.created_at,
    lastBody: last.body ?? `${last.message_type} message`,
    status: needsHuman ? 'pending_human' : 'automated',
    aiMode: needsHuman ? 'manual' : 'assistant',
  };
}

function mapMessage(message: WhatsappMessage): WhatsAiMessage {
  return {
    id: message.id,
    direction: message.direction,
    body: message.body ?? `[${message.message_type}]`,
    status: message.status,
    messageType: message.message_type,
    agent: message.agent,
    createdAt: message.created_at,
  };
}

function pickSelectedThread(threads: WhatsAiThread[], selectedPhone?: string | null) {
  if (!threads.length) return null;
  if (!selectedPhone) return threads[0];
  const key = normalizePhoneKey(selectedPhone);
  return threads.find((thread) => normalizePhoneKey(thread.phone) === key) ?? threads[0];
}

async function getReadClientOrNull(): Promise<any> {
  try {
    return await createClient();
  } catch {
    return serviceClientOrNull();
  }
}

function buildDemoInbox(selectedPhone?: string | null) {
  return buildInbox({
    source: 'demo',
    messages: demoMessages,
    leads: demoLeads,
    business: {
      id: 'demo-whatsai-business',
      name: 'Shree Krishna Developers',
      category: 'real_estate',
      status: 'trial',
      plan: 'trial',
      trial_ends_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      daily_message_limit: 500,
    },
    humanHandoffs: 1,
    selectedPhone,
  });
}

function makeDemoMessage(
  id: string,
  lead: Lead,
  direction: 'inbound' | 'outbound',
  body: string,
  minutesAgo: number,
  status: WhatsappMessage['status'],
  agent: string,
): WhatsappMessage {
  return {
    id,
    builder_id: lead.builder_id,
    lead_id: lead.id,
    resident_id: null,
    direction,
    phone: lead.phone,
    wa_message_id: id,
    message_type: 'text',
    body,
    media_url: null,
    template_name: null,
    template_params: [],
    interactive_payload: {},
    status,
    error: null,
    agent,
    created_at: new Date(now.getTime() + minutesAgo * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() + minutesAgo * 60 * 1000).toISOString(),
  };
}

function normalizePhoneKey(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}
