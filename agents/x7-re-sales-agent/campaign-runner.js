const MAX_BATCH_SIZE = 20;
const DEFAULT_INTERVAL_MS = 1000;

export function createCampaignRunner({
  supabase,
  sendTemplate,
  log = console,
  batchSize = MAX_BATCH_SIZE,
  intervalMs = DEFAULT_INTERVAL_MS,
}) {
  if (!supabase) throw new Error('Supabase is required for broadcast campaigns');
  if (typeof sendTemplate !== 'function') throw new Error('sendTemplate is required');
  const safeBatchSize = Math.min(Math.max(Number(batchSize) || MAX_BATCH_SIZE, 1), MAX_BATCH_SIZE);

  async function runCampaign(campaignId, { maxBatches = 50 } = {}) {
    const campaign = await loadCampaign(campaignId);
    if (!campaign) throw new Error('campaign_not_found');
    if (['completed', 'cancelled', 'paused'].includes(campaign.status)) {
      return { ok: true, skipped: true, status: campaign.status };
    }
    if (campaign.whatsapp_templates?.status !== 'APPROVED') throw new Error('campaign_template_not_approved');

    await supabase.from('broadcast_campaigns').update({
      status: 'processing',
      started_at: campaign.started_at || new Date().toISOString(),
    }).eq('id', campaignId);

    const workerId = `sales-${process.pid}-${Date.now()}`;
    let processed = 0;
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const { data: recipients, error } = await supabase.rpc('claim_broadcast_recipients', {
        p_campaign_id: campaignId,
        p_limit: safeBatchSize,
        p_worker_id: workerId,
      });
      if (error) throw new Error(error.message);
      if (!recipients?.length) break;

      const results = await Promise.all(recipients.map((recipient) => sendRecipient(campaign, recipient)));
      processed += results.length;
      await refreshMetrics(campaignId);
      if (recipients.length === safeBatchSize && batch < maxBatches - 1) await sleep(intervalMs);
    }

    const final = await finalizeCampaign(campaignId);
    log.info?.('broadcast_campaign_batch_complete', { campaign_id: campaignId, processed, status: final.status });
    return { ok: true, campaign_id: campaignId, processed, status: final.status, metrics: final };
  }

  async function sendRecipient(campaign, recipient) {
    try {
      const bodyParameters = renderTemplateParameters(campaign.variable_mapping, recipient.variables);
      const result = await sendTemplate({
        to: recipient.phone,
        businessId: campaign.business_id,
        name: campaign.whatsapp_templates.name,
        language: campaign.whatsapp_templates.language,
        bodyParameters,
      });
      if (!result?.ok) throw new Error(result?.error || 'template_send_failed');
      await supabase.from('broadcast_recipients').update({
        status: 'sent',
        provider_message_id: result.message_id || result.wa_message_id || null,
        sent_at: new Date().toISOString(),
        claimed_at: null,
        worker_id: null,
      }).eq('id', recipient.id).eq('business_id', campaign.business_id);
      return { id: recipient.id, ok: true };
    } catch (error) {
      const permanentFailure = Number(recipient.attempts || 0) >= 3;
      const retryDelayMs = Math.max(1, Number(recipient.attempts || 1)) * 60_000;
      await supabase.from('broadcast_recipients').update({
        status: 'failed',
        failed_at: permanentFailure ? new Date().toISOString() : null,
        next_attempt_at: new Date(Date.now() + retryDelayMs).toISOString(),
        claimed_at: null,
        worker_id: null,
        error_message: error instanceof Error ? error.message : 'template_send_failed',
      }).eq('id', recipient.id).eq('business_id', campaign.business_id);
      return { id: recipient.id, ok: false, error: error instanceof Error ? error.message : 'template_send_failed' };
    }
  }

  async function loadCampaign(campaignId) {
    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .select('*, whatsapp_templates(name, language, status)')
      .eq('id', campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function refreshMetrics(campaignId) {
    const { data, error } = await supabase.rpc('refresh_broadcast_campaign_metrics', { p_campaign_id: campaignId });
    if (error) throw new Error(error.message);
    return data;
  }

  async function finalizeCampaign(campaignId) {
    const { data: pending, error } = await supabase
      .from('broadcast_recipients')
      .select('id, status, attempts, next_attempt_at')
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'processing', 'failed']);
    if (error) throw new Error(error.message);
    const hasPending = (pending ?? []).some((recipient) => (
      recipient.status !== 'failed' || Number(recipient.attempts || 0) < 3
    ));
    const status = hasPending ? 'processing' : 'completed';
    const values = {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };
    await supabase.from('broadcast_campaigns').update(values).eq('id', campaignId);
    return { ...(await refreshMetrics(campaignId)), ...values };
  }

  return { runCampaign };
}

export function renderTemplateParameters(variableMapping = {}, recipientVariables = {}) {
  return Object.entries(variableMapping)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, source]) => {
      if (String(source).startsWith('literal:')) return String(source).slice('literal:'.length);
      return String(recipientVariables?.[source] ?? '');
    });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
