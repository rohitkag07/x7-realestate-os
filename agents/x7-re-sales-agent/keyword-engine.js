const MATCH_WEIGHT = Object.freeze({ exact: 3, word: 2, contains: 1 });

export function normalizeMessage(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareKeywordRules(rules) {
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule, index) => ({
      ...rule,
      _index: index,
      id: String(rule?.id || `rule-${index + 1}`),
      label: String(rule?.label || `Rule ${index + 1}`),
      match_type: ['exact', 'word', 'contains'].includes(rule?.match_type) ? rule.match_type : 'contains',
      priority: Number.isFinite(Number(rule?.priority)) ? Number(rule.priority) : 0,
      enabled: rule?.enabled !== false,
      handoff: rule?.handoff === true,
      reply: String(rule?.reply || '').trim(),
      keywords: Array.isArray(rule?.keywords)
        ? [...new Set(rule.keywords.map(normalizeMessage).filter(Boolean))]
        : [],
    }))
    .filter((rule) => rule.enabled && rule.reply && rule.keywords.length)
    .sort((left, right) => (
      right.priority - left.priority
      || MATCH_WEIGHT[right.match_type] - MATCH_WEIGHT[left.match_type]
      || longestKeyword(right) - longestKeyword(left)
      || left._index - right._index
    ));
}

export function findKeywordReply(message, rules) {
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return null;

  for (const rule of prepareKeywordRules(rules)) {
    for (const keyword of rule.keywords) {
      if (matches(normalizedMessage, keyword, rule.match_type)) {
        const { _index, ...publicRule } = rule;
        return { rule: publicRule, keyword, normalized_message: normalizedMessage };
      }
    }
  }

  return null;
}

function matches(message, keyword, matchType) {
  if (matchType === 'exact') return message === keyword;
  if (matchType === 'word') return (` ${message} `).includes(` ${keyword} `);
  return message.includes(keyword);
}

function longestKeyword(rule) {
  return rule.keywords.reduce((length, keyword) => Math.max(length, keyword.length), 0);
}
