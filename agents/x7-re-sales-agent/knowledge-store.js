export async function fetchPublishedKnowledge({ supabase, businessId, playbookId }) {
  if (!supabase || !businessId) return [];
  let query = supabase
    .from('assistant_knowledge_items')
    .select('id, business_id, playbook_id, type, title, question, content, keywords, locale, status, okf_slug, source_type, source_url, media_url, interactive_buttons, metadata, is_active, version, last_reviewed_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (playbookId) query = query.or(`playbook_id.eq.${playbookId},playbook_id.is.null`);
  const { data, error } = await query;
  if (error) throw new KnowledgeStoreError(error.message, 502);
  return Array.isArray(data) ? data.filter((item) => item.business_id === businessId) : [];
}

export class KnowledgeStoreError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'KnowledgeStoreError';
    this.status = status;
  }
}
