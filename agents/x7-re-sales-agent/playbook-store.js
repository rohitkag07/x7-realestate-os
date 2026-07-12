export async function fetchActivePlaybook({ supabase, businessId, playbookId = null }) {
  if (!supabase) throw new PlaybookStoreError('supabase_not_configured', 503);
  if (!businessId) throw new PlaybookStoreError('business_id_required', 400);

  let query = supabase
    .from('assistant_playbooks')
    .select('id, business_id, vertical, name, keyword_replies, fallback_reply, playbook_version, handoff_rules, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true);

  query = playbookId
    ? query.eq('id', playbookId)
    : query.order('created_at', { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) throw new PlaybookStoreError(error.message, 502);
  if (!data) throw new PlaybookStoreError('active_playbook_not_found', 404);
  if (data.business_id !== businessId) throw new PlaybookStoreError('playbook_tenant_mismatch', 403);

  return {
    ...data,
    keyword_replies: Array.isArray(data.keyword_replies) ? data.keyword_replies : [],
    fallback_reply: String(data.fallback_reply || '').trim(),
  };
}

export class PlaybookStoreError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PlaybookStoreError';
    this.status = status;
  }
}
