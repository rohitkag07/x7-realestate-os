import { createServiceClient } from '@/lib/supabase/server';
import { callSummonerDispatch } from '@/lib/summoner-server';

const salesAgentUrl = process.env.SALES_AGENT_URL || 'http://localhost:8080';
const agentSecret = process.env.AGENT_SECRET || '';

export function serviceClientOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export async function callSalesAgent<T>(path: string, payload: unknown): Promise<T | null> {
  const viaSummoner = await callSummonerDispatch<T>('sales', path, payload);
  if (viaSummoner) return viaSummoner;

  try {
    const response = await fetch(`${salesAgentUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function logAgentRun({
  builderId,
  leadId,
  projectId,
  action,
  input,
  output,
  status = 'success',
}: {
  builderId?: string | null;
  leadId?: string | null;
  projectId?: string | null;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status?: 'success' | 'partial' | 'failure';
}) {
  const supabase = serviceClientOrNull();
  if (!supabase || !builderId) return;

  await (supabase.from('agent_runs') as any).insert({
    builder_id: builderId,
    agent: 'sales-agent-proxy',
    action,
    lead_id: leadId ?? null,
    project_id: projectId ?? null,
    input,
    output,
    status,
  });
}

export function bilingual(hi: string, en: string, locale: 'hi' | 'en' | 'hi-en' = 'hi-en') {
  if (locale === 'hi') return { hi, en, bilingual: hi };
  if (locale === 'en') return { hi, en, bilingual: en };
  return { hi, en, bilingual: `${hi}\n\n${en}` };
}

export function fallbackFollowUp({
  leadName,
  leadStage,
  budgetRange,
  locale = 'hi-en',
}: {
  leadName: string;
  leadStage: 'new' | 'qualified' | 'visit_scheduled' | 'visited' | 'negotiation' | 'booked' | 'lost';
  budgetRange?: string | null;
  locale?: 'hi' | 'en' | 'hi-en';
}) {
  const hiMap = {
    new: `${leadName} ji, aapke liye latest brochure aur options ready hain. Kya main budget ke hisaab se best shortlist bhej doon?`,
    qualified: `${leadName} ji, ${budgetRange ? `${budgetRange} range` : 'aapke budget'} ke hisaab se best options ready hain. Kya site visit slot block kar doon?`,
    visit_scheduled: `${leadName} ji, aapki site visit confirm hai. Main route map aur gate assist details bhej raha hoon.`,
    visited: `${leadName} ji, visit ke baad jo options short-list huye the unka payment-plan summary ready hai.`,
    negotiation: `${leadName} ji, selected plot hold karne ke liye token window open hai. Ready hon toh payment link share kar deta hoon.`,
    booked: `${leadName} ji, token receive ho chuka hai. Agreement draft aur receipt aapko shortly mil jayegi.`,
    lost: `${leadName} ji, jab bhi revisit karna ho, updated inventory aur offers ke saath main available hoon.`,
  };
  const enMap = {
    new: `I have the latest brochure and shortlist ready for you. Shall I send the best-fit options by budget?`,
    qualified: `I have the best-fit options ready${budgetRange ? ` for the ${budgetRange} range` : ''}. Should I block a site-visit slot?`,
    visit_scheduled: `Your site visit is confirmed. I’m sending the route map and gate-assist details now.`,
    visited: `I’ve prepared the post-visit shortlist and payment-plan summary for you.`,
    negotiation: `The token window to hold your selected plot is open. If you're ready, I can share the payment link now.`,
    booked: `Your token has been received. The agreement draft and receipt will follow shortly.`,
    lost: `Whenever you want to revisit, I can share updated inventory and offers.`,
  };
  return bilingual(hiMap[leadStage], enMap[leadStage], locale);
}

export function fallbackDrip({
  leadName,
  leadStage,
  days = [0, 2, 5, 7, 14, 21, 30],
  locale = 'hi-en',
}: {
  leadName: string;
  leadStage: string;
  days?: number[];
  locale?: 'hi' | 'en' | 'hi-en';
}) {
  return days.map((day) => ({
    step: `day_${day}`,
    day,
    scheduled_for: futureIso(day),
    body: bilingual(
      `${leadName} ji, Day ${day} follow-up: Krishna Greens ki latest update ready hai. Reply karein toh main immediately continue karta hoon.`,
      `${leadName}, Day ${day} follow-up: the latest Krishna Greens update is ready. Reply and I’ll continue immediately.`,
      locale,
    ),
    lead_stage: leadStage,
  }));
}

export function fallbackBookingConfirmation({
  date,
  time,
  locale = 'hi-en',
}: {
  date: string;
  time: string;
  locale?: 'hi' | 'en' | 'hi-en';
}) {
  return bilingual(
    `Site visit ${date} ko ${time} par schedule kar di gayi hai. Gate location aur reminder aapko WhatsApp par mil jayega.`,
    `Your site visit is scheduled for ${date} at ${time}. Gate location and reminders will follow on WhatsApp.`,
    locale,
  );
}

export function buildVisitReminderSteps({
  leadName,
  date,
  time,
  locale = 'hi-en',
}: {
  leadName: string;
  date: string;
  time: string;
  locale?: 'hi' | 'en' | 'hi-en';
}) {
  return [
    {
      step: 'visit_day_before',
      scheduled_for: visitReminderIso(date, time, -1, 18, 0),
      body: bilingual(
        `${leadName} ji, kal aapki site visit ${time} par scheduled hai. Main route map aur gate contact aaj shaam tak share kar dunga.`,
        `${leadName}, your site visit is scheduled for tomorrow at ${time}. I’ll share the route map and gate contact by this evening.`,
        locale,
      ),
    },
    {
      step: 'visit_same_day',
      scheduled_for: visitReminderIso(date, time, 0, 8, 30),
      body: bilingual(
        `${leadName} ji, aaj aapki site visit ${time} par hai. Nikalne se pehle is message par reply kar dein, main gate assist ready rakhunga.`,
        `${leadName}, your site visit is today at ${time}. Reply before you leave and I’ll keep gate assist ready.`,
        locale,
      ),
    },
  ];
}

function futureIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function visitReminderIso(date: string, time: string, dayOffset: number, fallbackHour: number, fallbackMinute: number) {
  const reminder = new Date(`${date}T09:00:00`);
  if (Number.isNaN(reminder.getTime())) return futureIso(Math.max(dayOffset, 0));

  const parsed = parseTime(time);
  reminder.setDate(reminder.getDate() + dayOffset);
  reminder.setHours(parsed?.hours ?? fallbackHour, parsed?.minutes ?? fallbackMinute, 0, 0);
  return reminder.toISOString();
}

function parseTime(value: string) {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3];

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}
