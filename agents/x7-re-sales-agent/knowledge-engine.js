import { findKeywordReply, normalizeMessage } from './keyword-engine.js';

const TYPE_PRIORITY = Object.freeze({
  pricing: 90,
  policy: 85,
  location: 80,
  offer: 75,
  service: 70,
  faq: 60,
  document: 50,
  other: 40,
});

export function prepareKnowledgeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => ({
      ...item,
      _index: index,
      id: String(item?.id || ''),
      title: String(item?.title || '').trim(),
      question: String(item?.question || '').trim(),
      content: String(item?.content || '').trim(),
      type: String(item?.type || 'other'),
      status: String(item?.status || 'draft'),
      is_active: item?.is_active !== false,
      keywords: [...new Set([
        ...(Array.isArray(item?.keywords) ? item.keywords : []),
        item?.question,
        item?.title,
      ].map(normalizeMessage).filter(Boolean))],
    }))
    .filter((item) => item.id && item.content && item.status === 'published' && item.is_active && item.keywords.length);
}

export function findKnowledgeReply(message, items) {
  const prepared = prepareKnowledgeItems(items);
  if (!prepared.length) return null;
  const rules = prepared.map((item) => ({
    id: item.id,
    label: item.title,
    keywords: item.keywords,
    match_type: 'word',
    reply: item.content,
    priority: TYPE_PRIORITY[item.type] ?? TYPE_PRIORITY.other,
    enabled: true,
    handoff: false,
    fuzzy_enabled: true,
    fuzzy_threshold: 0.86,
  }));
  const match = findKeywordReply(message, rules);
  if (!match) return null;
  const item = prepared.find((candidate) => candidate.id === match.rule.id);
  if (!item) return null;
  return {
    item: withoutPrivateFields(item),
    keyword: match.keyword,
    match_mode: match.match_mode,
    confidence: match.confidence,
    normalized_message: match.normalized_message,
  };
}

function withoutPrivateFields(item) {
  const { _index, ...value } = item;
  return value;
}
