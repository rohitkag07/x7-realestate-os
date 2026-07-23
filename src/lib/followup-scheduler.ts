import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveLegacyBuilderId } from '@/lib/legacy-builder';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendWhatsAppCloudMessage,
  type WhatsAppSendResult,
} from '@/lib/whatsapp-cloud-api';

type FollowupStep = {
  day: number;
  message: string;
};

type ClaimedJob = {
  id: string;
  sequence_id: string;
  thread_id: string;
  contact_id: string;
  business_id: string;
  step_index: number;
};

export type FollowupRunResult = {
  claimed: number;
  sent: number;
  failed: number;
  cancelled: number;
};

const batchSize = 10;

export async function processDueFollowups(): Promise<FollowupRunResult> {
  const supabase = createServiceClient();
  await recoverStaleJobs(supabase);

  const due = await supabase
    .from('followup_jobs')
    .select('id, sequence_id, thread_id, contact_id, business_id, step_index')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(batchSize);
  if (due.error) throw new Error(`Follow-up lookup failed: ${due.error.message}`);

  const result: FollowupRunResult = { claimed: 0, sent: 0, failed: 0, cancelled: 0 };
  for (const candidate of (due.data ?? []) as Array<{ id: string }>) {
    const job = await claimJob(supabase, candidate.id);
    if (!job) continue;
    result.claimed += 1;
    const outcome = await deliverJob(supabase, job);
    result[outcome] += 1;
  }
  return result;
}

async function recoverStaleJobs(supabase: SupabaseClient<any>) {
  const staleAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await supabase
    .from('followup_jobs')
    .update({
      status: 'pending',
      locked_at: null,
      error: 'stale_lock_recovered',
    })
    .eq('status', 'processing')
    .lt('locked_at', staleAt);
}

async function claimJob(
  supabase: SupabaseClient<any>,
  jobId: string,
): Promise<ClaimedJob | null> {
  const result = await supabase
    .from('followup_jobs')
    .update({
      status: 'processing',
      locked_at: new Date().toISOString(),
      error: null,
    })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id, sequence_id, thread_id, contact_id, business_id, step_index')
    .maybeSingle();
  if (result.error) throw new Error(`Follow-up claim failed: ${result.error.message}`);
  return result.data as ClaimedJob | null;
}

async function deliverJob(
  supabase: SupabaseClient<any>,
  job: ClaimedJob,
): Promise<'sent' | 'failed' | 'cancelled'> {
  try {
    const [sequenceResult, threadResult, contactResult, channelResult] = await Promise.all([
      supabase
        .from('followup_sequences')
        .select('id, steps, active')
        .eq('id', job.sequence_id)
        .eq('business_id', job.business_id)
        .maybeSingle(),
      supabase
        .from('conversation_threads')
        .select('id, status, ai_mode')
        .eq('id', job.thread_id)
        .eq('business_id', job.business_id)
        .maybeSingle(),
      supabase
        .from('conversation_contacts')
        .select('id, phone, name')
        .eq('id', job.contact_id)
        .eq('business_id', job.business_id)
        .maybeSingle(),
      supabase
        .from('business_channels')
        .select('*')
        .eq('business_id', job.business_id)
        .eq('is_active', true)
        .or('channel_type.eq.whatsapp,provider.eq.meta_whatsapp')
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (
      sequenceResult.error
      || threadResult.error
      || contactResult.error
      || channelResult.error
    ) {
      throw new Error('Follow-up dependencies could not be loaded.');
    }

    const sequence = sequenceResult.data;
    const thread = threadResult.data;
    const contact = contactResult.data;
    const channel = channelResult.data;
    if (!sequence?.active || !thread || !contact || !channel) {
      await cancelJob(supabase, job.id, 'followup_dependency_missing');
      return 'cancelled';
    }
    if (
      thread.ai_mode === 'manual'
      || ['pending_human', 'human_takeover', 'bot_paused', 'resolved', 'closed', 'archived']
        .includes(thread.status)
    ) {
      await cancelJob(supabase, job.id, 'human_takeover_or_closed');
      return 'cancelled';
    }

    const steps = normalizeSteps(sequence.steps);
    const step = steps[job.step_index];
    if (!step) {
      await cancelJob(supabase, job.id, 'followup_step_missing');
      return 'cancelled';
    }

    const body = step.message.replace(/\{\{\s*name\s*\}\}/gi, contact.name || 'there');
    const outbound = await sendWhatsAppCloudMessage({
      to: contact.phone,
      phoneNumberId: channel.phone_number_id || channel.channel_id,
      accessToken: channelAccessToken(channel),
      message: { type: 'text', body },
    });
    await persistFollowupOutbound(supabase, job, contact.phone, body, outbound);

    if (!outbound.ok) {
      await failJob(supabase, job.id, outbound.error || 'WhatsApp delivery failed.');
      return 'failed';
    }

    await supabase
      .from('followup_jobs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        locked_at: null,
        error: null,
      })
      .eq('id', job.id)
      .eq('status', 'processing');
    await enqueueNextStep(supabase, job, steps);
    await incrementMessagesOut(supabase, job.business_id);
    return 'sent';
  } catch (error) {
    await failJob(
      supabase,
      job.id,
      error instanceof Error ? error.message : 'Follow-up execution failed.',
    );
    return 'failed';
  }
}

async function persistFollowupOutbound(
  supabase: SupabaseClient<any>,
  job: ClaimedJob,
  phone: string,
  body: string,
  outbound: WhatsAppSendResult,
) {
  const builderId = await resolveLegacyBuilderId(supabase, job.business_id);
  const audit = builderId
    ? await supabase
      .from('whatsapp_messages')
      .insert({
        builder_id: builderId,
        direction: 'outbound',
        phone,
        wa_message_id: outbound.messageId,
        message_type: 'text',
        body,
        status: outbound.status,
        error: outbound.error,
        agent: 'vercel-followup-scheduler',
        interactive_payload: {},
        template_params: [{ followup_job_id: job.id }],
      })
      .select('id')
      .maybeSingle()
    : { data: null };

  const canonical = await supabase.from('conversation_messages').insert({
    thread_id: job.thread_id,
    contact_id: job.contact_id,
    business_id: job.business_id,
    builder_id: null,
    whatsapp_message_id: audit.data?.id ?? null,
    direction: 'outbound',
    role: 'assistant',
    channel: 'whatsapp',
    message_type: 'text',
    content: body,
    body,
    provider_msg_id: outbound.messageId,
    status: outbound.status,
    agent: 'vercel-followup-scheduler',
    metadata: {
      followup_job_id: job.id,
      sequence_id: job.sequence_id,
      step_index: job.step_index,
      error: outbound.error,
    },
  });
  if (canonical.error) {
    throw new Error(`Follow-up persistence failed: ${canonical.error.message}`);
  }
  await supabase
    .from('conversation_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', job.thread_id)
    .eq('business_id', job.business_id);
}

async function enqueueNextStep(
  supabase: SupabaseClient<any>,
  job: ClaimedJob,
  steps: FollowupStep[],
) {
  const nextIndex = job.step_index + 1;
  const next = steps[nextIndex];
  if (!next) return;
  const previousDay = steps[job.step_index]?.day ?? 0;
  const delayDays = Math.max(next.day - previousDay, 0);
  await supabase.from('followup_jobs').upsert({
    sequence_id: job.sequence_id,
    thread_id: job.thread_id,
    contact_id: job.contact_id,
    business_id: job.business_id,
    step_index: nextIndex,
    scheduled_at: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  }, { onConflict: 'sequence_id,thread_id,step_index', ignoreDuplicates: true });
}

function normalizeSteps(value: unknown): FollowupStep[] {
  return (Array.isArray(value) ? value : [])
    .map((step) => ({
      day: Number(step?.day),
      message: String(step?.message || '').trim(),
    }))
    .filter((step) => Number.isInteger(step.day) && step.day >= 0 && step.message);
}

async function cancelJob(supabase: SupabaseClient<any>, id: string, reason: string) {
  await supabase
    .from('followup_jobs')
    .update({ status: 'cancelled', locked_at: null, error: reason })
    .eq('id', id)
    .eq('status', 'processing');
}

async function failJob(supabase: SupabaseClient<any>, id: string, error: string) {
  await supabase
    .from('followup_jobs')
    .update({ status: 'failed', locked_at: null, error: error.slice(0, 500) })
    .eq('id', id)
    .eq('status', 'processing');
}

async function incrementMessagesOut(supabase: SupabaseClient<any>, businessId: string) {
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from('business_usage').upsert(
    { business_id: businessId, date },
    { onConflict: 'business_id,date', ignoreDuplicates: true },
  );
  const current = await supabase
    .from('business_usage')
    .select('messages_out')
    .eq('business_id', businessId)
    .eq('date', date)
    .maybeSingle();
  if (!current.error) {
    await supabase
      .from('business_usage')
      .update({ messages_out: Number(current.data?.messages_out ?? 0) + 1 })
      .eq('business_id', businessId)
      .eq('date', date);
  }
}

function channelAccessToken(channel: { config?: Record<string, unknown> }) {
  const configured = channel.config?.whatsapp_access_token || channel.config?.access_token;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : null;
}
