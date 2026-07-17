const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeSteps(rawSteps) {
  return (Array.isArray(rawSteps) ? rawSteps : [])
    .map((step) => ({ day: Number(step?.day), message: String(step?.message || '').trim() }))
    .filter((step) => Number.isInteger(step.day) && step.day >= 0 && step.message.length > 0)
    .sort((left, right) => left.day - right.day);
}

function scheduleAt(daysFromNow) {
  return new Date(Date.now() + daysFromNow * DAY_MS).toISOString();
}

async function findSequence(supabase, businessId, playbookId) {
  if (playbookId) {
    const scoped = await supabase
      .from('followup_sequences')
      .select('id, steps')
      .eq('business_id', businessId)
      .eq('playbook_id', playbookId)
      .eq('active', true)
      .maybeSingle();
    if (scoped.error) throw scoped.error;
    if (scoped.data) return scoped.data;
  }

  const fallback = await supabase
    .from('followup_sequences')
    .select('id, steps')
    .eq('business_id', businessId)
    .is('playbook_id', null)
    .eq('active', true)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data;
}

export async function enqueueFirstFollowup({ supabase, businessId, playbookId, threadId, contactId }) {
  if (!supabase || !businessId || !threadId || !contactId) return { ok: false, skipped: true, reason: 'missing_context' };

  const sequence = await findSequence(supabase, businessId, playbookId);
  const steps = normalizeSteps(sequence?.steps);
  if (!sequence || !steps.length) return { ok: false, skipped: true, reason: 'no_active_sequence' };

  const { error } = await supabase.from('followup_jobs').upsert({
    sequence_id: sequence.id,
    thread_id: threadId,
    contact_id: contactId,
    business_id: businessId,
    step_index: 0,
    scheduled_at: scheduleAt(steps[0].day),
  }, { onConflict: 'sequence_id,thread_id,step_index', ignoreDuplicates: true });

  if (error) throw error;
  return { ok: true, sequenceId: sequence.id, scheduledAt: scheduleAt(steps[0].day) };
}

async function sendFollowup({ job, sequence, supabase, toolGatewayUrl, agentSecret }) {
  const steps = normalizeSteps(sequence.steps);
  const step = steps[job.step_index];
  if (!step) throw new Error('followup_step_missing');

  const { data: contact, error: contactError } = await supabase
    .from('conversation_contacts')
    .select('id, name, phone')
    .eq('id', job.contact_id)
    .eq('business_id', job.business_id)
    .maybeSingle();
  if (contactError || !contact?.phone) throw new Error(contactError?.message || 'followup_contact_not_found');

  const body = step.message.replaceAll('{{name}}', contact.name?.trim() || 'there');
  const response = await fetch(`${toolGatewayUrl}/whatsapp/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-secret': agentSecret },
    body: JSON.stringify({ to: contact.phone, body, business_id: job.business_id }),
  });
  const sent = await response.json().catch(() => ({}));
  if (!response.ok || !sent?.ok) throw new Error(sent?.error || `tool_gateway_${response.status}`);

  const now = new Date().toISOString();
  await supabase.from('conversation_messages').insert({
    business_id: job.business_id,
    thread_id: job.thread_id,
    contact_id: job.contact_id,
    direction: 'outbound',
    channel: 'whatsapp',
    message_type: 'text',
    body,
    status: 'sent',
    agent: 'followup-scheduler',
    whatsapp_message_id: sent?.whatsapp_message_id || null,
    metadata: { followup_job_id: job.id, sequence_id: sequence.id, step_index: job.step_index },
  });

  await supabase.from('followup_jobs').update({ status: 'sent', sent_at: now, locked_at: null, updated_at: now }).eq('id', job.id);
  const nextStep = steps[job.step_index + 1];
  if (nextStep) {
    await supabase.from('followup_jobs').upsert({
      sequence_id: sequence.id,
      thread_id: job.thread_id,
      contact_id: job.contact_id,
      business_id: job.business_id,
      step_index: job.step_index + 1,
      scheduled_at: scheduleAt(nextStep.day),
    }, { onConflict: 'sequence_id,thread_id,step_index', ignoreDuplicates: true });
  }
}

export async function processDueFollowups({ supabase, toolGatewayUrl, agentSecret, log = console }) {
  if (!supabase) return { processed: 0, skipped: true };
  const now = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from('followup_jobs')
    .select('id, sequence_id, thread_id, contact_id, business_id, step_index')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(25);
  if (error) throw error;

  let processed = 0;
  for (const job of jobs || []) {
    const claim = await supabase
      .from('followup_jobs')
      .update({ status: 'processing', locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id, sequence_id, thread_id, contact_id, business_id, step_index')
      .maybeSingle();
    if (claim.error || !claim.data) continue;

    try {
      const { data: sequence, error: sequenceError } = await supabase
        .from('followup_sequences')
        .select('id, steps, active')
        .eq('id', job.sequence_id)
        .eq('business_id', job.business_id)
        .maybeSingle();
      if (sequenceError || !sequence?.active) throw new Error(sequenceError?.message || 'followup_sequence_inactive');
      await sendFollowup({ job: claim.data, sequence, supabase, toolGatewayUrl, agentSecret });
      processed += 1;
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'followup_send_failed';
      await supabase.from('followup_jobs').update({ status: 'failed', error: message, locked_at: null, updated_at: new Date().toISOString() }).eq('id', job.id);
      log.warn?.('followup_job_failed', { job_id: job.id, error: message });
    }
  }
  return { processed };
}

export function startFollowupScheduler({ supabase, toolGatewayUrl, agentSecret, intervalMs = 5 * 60 * 1000, log = console }) {
  if (!supabase) return () => {};
  const run = async () => {
    try {
      await processDueFollowups({ supabase, toolGatewayUrl, agentSecret, log });
    } catch (error) {
      log.warn?.('followup_scheduler_failed', { error: error instanceof Error ? error.message : 'unknown' });
    }
  };
  void run();
  const timer = setInterval(run, intervalMs);
  return () => clearInterval(timer);
}
