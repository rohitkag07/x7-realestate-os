import { createServiceClient } from '@/lib/supabase/server';

export type TrialConsoleSource = 'supabase' | 'demo';

export type TrialStatus = {
  source: TrialConsoleSource;
  businessId: string | null;
  businessName: string;
  ownerPhone: string;
  planKey: string;
  planName: string;
  trialDay: number;
  trialLengthDays: number;
  trialProgress: number;
  messagesUsedToday: number;
  messagesLimitToday: number;
  qualifiedLeadsThisWeek: number;
  handoffsGenerated: number;
  status: string;
};

export type SetupChecklistStep = {
  id: string;
  key: string;
  label: string;
  isDone: boolean;
  completedAt: string | null;
};

export type TrialConsoleData = {
  trial: TrialStatus;
  checklist: SetupChecklistStep[];
  checklistCompletion: number;
};

const DEMO_CHECKLIST: SetupChecklistStep[] = [
  { id: 'demo-business-profile', key: 'business_profile', label: 'Complete business profile (name, phone, city)', isDone: true, completedAt: new Date().toISOString() },
  { id: 'demo-whatsapp-channel', key: 'whatsapp_channel', label: 'Connect WhatsApp Business number', isDone: true, completedAt: new Date().toISOString() },
  { id: 'demo-playbook-selected', key: 'playbook_selected', label: 'Select or create an assistant playbook', isDone: true, completedAt: new Date().toISOString() },
  { id: 'demo-owner-handoff', key: 'owner_handoff_number', label: 'Set owner WhatsApp number for handoffs', isDone: false, completedAt: null },
  { id: 'demo-test-message', key: 'test_message_sent', label: 'Send a test WhatsApp message', isDone: false, completedAt: null },
  { id: 'demo-daily-summary', key: 'daily_summary_on', label: 'Enable daily hot-lead summary', isDone: false, completedAt: null },
  { id: 'demo-first-lead', key: 'first_lead_captured', label: 'Capture first real lead', isDone: false, completedAt: null },
  { id: 'demo-trial-reviewed', key: 'trial_reviewed', label: 'Review 7-day trial results with team', isDone: false, completedAt: null },
];

export const DEMO_TRIAL_CONSOLE: TrialConsoleData = {
  trial: {
    source: 'demo',
    businessId: null,
    businessName: 'Indore Coaching Trial',
    ownerPhone: '+919876543210',
    planKey: 'trial',
    planName: 'Trial',
    trialDay: 3,
    trialLengthDays: 7,
    trialProgress: 43,
    messagesUsedToday: 24,
    messagesLimitToday: 50,
    qualifiedLeadsThisWeek: 8,
    handoffsGenerated: 2,
    status: 'trialing',
  },
  checklist: DEMO_CHECKLIST,
  checklistCompletion: completionFor(DEMO_CHECKLIST),
};

export async function getTrialConsoleData(): Promise<TrialConsoleData> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return DEMO_TRIAL_CONSOLE;
  }

  const business = await (supabase.from('businesses') as any)
    .select('id, name, phone, created_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const businessId = business.data?.id ?? null;
  if (!businessId) return DEMO_TRIAL_CONSOLE;

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const [subscription, todayUsage, weekUsage, checklist] = await Promise.all([
    (supabase.from('business_subscriptions') as any)
      .select('*, subscription_plans(key, name, limits)')
      .eq('business_id', businessId)
      .maybeSingle(),
    (supabase.from('business_usage') as any)
      .select('messages_in, messages_out, handoffs, qual_answers')
      .eq('business_id', businessId)
      .eq('date', today)
      .maybeSingle(),
    (supabase.from('business_usage') as any)
      .select('messages_in, messages_out, handoffs, qual_answers')
      .eq('business_id', businessId)
      .gte('date', weekStartDate)
      .lte('date', today),
    (supabase.from('business_setup_checklist') as any)
      .select('id, step_key, step_label, is_done, completed_at, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true }),
  ]);

  const plan = subscription.data?.subscription_plans ?? null;
  const usageToday = todayUsage.data ?? {};
  const weekRows = weekUsage.data ?? [];
  const checklistSteps = normalizeChecklist(checklist.data);
  const trialLengthDays = 7;
  const startAt = subscription.data?.current_period_start ?? business.data?.created_at ?? new Date().toISOString();
  const endAt = subscription.data?.trial_end ?? subscription.data?.current_period_end ?? null;
  const trialDay = computeTrialDay(startAt, trialLengthDays);
  const limit = Number(plan?.limits?.messages_per_day ?? 50);

  return {
    trial: {
      source: 'supabase',
      businessId,
      businessName: business.data?.name ?? 'X7 WhatsAI Trial',
      ownerPhone: business.data?.phone ?? '',
      planKey: plan?.key ?? 'trial',
      planName: plan?.name ?? 'Trial',
      trialDay,
      trialLengthDays,
      trialProgress: computeTrialProgress(startAt, endAt, trialLengthDays),
      messagesUsedToday: Number(usageToday.messages_in ?? 0) + Number(usageToday.messages_out ?? 0),
      messagesLimitToday: limit,
      qualifiedLeadsThisWeek: sumField(weekRows, 'qual_answers'),
      handoffsGenerated: sumField(weekRows, 'handoffs'),
      status: subscription.data?.status ?? 'trialing',
    },
    checklist: checklistSteps.length ? checklistSteps : DEMO_CHECKLIST,
    checklistCompletion: completionFor(checklistSteps.length ? checklistSteps : DEMO_CHECKLIST),
  };
}

function normalizeChecklist(rows: any[] | null | undefined): SetupChecklistStep[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    key: String(row.step_key),
    label: String(row.step_label),
    isDone: Boolean(row.is_done),
    completedAt: row.completed_at ?? null,
  }));
}

function completionFor(steps: SetupChecklistStep[]) {
  if (!steps.length) return 0;
  return Math.round((steps.filter((step) => step.isDone).length / steps.length) * 100);
}

function computeTrialDay(startAt: string, lengthDays: number) {
  const started = new Date(startAt).getTime();
  if (Number.isNaN(started)) return 1;
  const elapsed = Date.now() - started;
  const day = Math.floor(elapsed / 86_400_000) + 1;
  return Math.min(lengthDays, Math.max(1, day));
}

function computeTrialProgress(startAt: string, endAt: string | null, lengthDays: number) {
  const started = new Date(startAt).getTime();
  const ended = endAt ? new Date(endAt).getTime() : started + lengthDays * 86_400_000;
  if (Number.isNaN(started) || Number.isNaN(ended) || ended <= started) return 0;
  return Math.min(100, Math.max(0, Math.round(((Date.now() - started) / (ended - started)) * 100)));
}

function sumField(rows: any[], field: string) {
  return rows.reduce((total, row) => total + Number(row?.[field] ?? 0), 0);
}
