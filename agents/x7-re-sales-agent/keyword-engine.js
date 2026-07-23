import synonymPacks from '../../shared/hinglish-synonyms.json' with { type: 'json' };

const MATCH_WEIGHT = Object.freeze({ exact: 3, word: 2, contains: 1 });
const INTENTS = Object.freeze(['price', 'location', 'timing', 'booking', 'offers']);
const DEFAULT_FUZZY_THRESHOLD = 0.82;
const MIN_FUZZY_TOKEN_LENGTH = 4;

export function normalizeMessage(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/(.)\1{2,}/gu, '$1$1')
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
      fuzzy_enabled: rule?.fuzzy_enabled !== false,
      fuzzy_threshold: validThreshold(rule?.fuzzy_threshold),
      intent: INTENTS.includes(rule?.intent) ? rule.intent : null,
      reply: String(rule?.reply || '').trim(),
      keywords: Array.isArray(rule?.keywords)
        ? [...new Set(rule.keywords.map(normalizeMessage).filter(Boolean))]
        : [],
    }))
    .filter((rule) => rule.enabled && rule.reply && rule.keywords.length)
    .sort(compareRules);
}

export function findKeywordReply(message, rules) {
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return null;
  const prepared = prepareKeywordRules(rules);

  for (const rule of prepared) {
    for (const keyword of rule.keywords) {
      if (matches(normalizedMessage, keyword, rule.match_type)) {
        return publicMatch(rule, keyword, normalizedMessage, { match_mode: 'direct', confidence: 1 });
      }
    }
  }

  const aliasResult = matchKnownIntent(normalizedMessage, prepared);
  if (aliasResult) return aliasResult;

  return matchFuzzy(normalizedMessage, prepared);
}

export function findKeywordReplyFromPayload(payload, rules) {
  const value = String(payload || '').trim();
  if (!value) return null;
  const prepared = prepareKeywordRules(rules);
  if (value.startsWith('rule:')) {
    const ruleId = value.slice('rule:'.length);
    const rule = prepared.find((candidate) => candidate.id === ruleId);
    return rule
      ? publicMatch(rule, value, normalizeMessage(value), { match_mode: 'button_payload', confidence: 1 })
      : null;
  }
  if (value.startsWith('keyword:')) return findKeywordReply(value.slice('keyword:'.length), rules);
  return findKeywordReply(value, rules);
}

// Optimal string alignment Damerau-Levenshtein. It catches one transposition or
// typo without letting unrelated short words become matches.
export function damerauLevenshtein(left, right) {
  const a = normalizeMessage(left);
  const b = normalizeMessage(right);
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= b.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
      if (row > 1 && column > 1 && a[row - 1] === b[column - 2] && a[row - 2] === b[column - 1]) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
}

export function fuzzySimilarity(left, right) {
  const longest = Math.max(normalizeMessage(left).length, normalizeMessage(right).length, 1);
  return 1 - (damerauLevenshtein(left, right) / longest);
}

function matchKnownIntent(message, rules) {
  const intent = detectIntent(message);
  if (!intent) return null;
  const candidate = rules.find((rule) => ruleIntent(rule) === intent);
  if (!candidate) return null;
  return publicMatch(candidate, intent, message, {
    match_mode: 'synonym',
    confidence: 0.96,
    intent,
    alias_pack_version: synonymPacks.version,
  });
}

function matchFuzzy(message, rules) {
  if (process.env.HINGLISH_FUZZY_MATCHING_ENABLED === 'false') return null;
  const candidates = [];
  const tokens = message.split(' ').filter((token) => token.length >= MIN_FUZZY_TOKEN_LENGTH);
  for (const rule of rules) {
    if (!rule.fuzzy_enabled) continue;
    const threshold = rule.fuzzy_threshold;
    for (const keyword of rule.keywords) {
      const score = bestPhraseSimilarity(message, tokens, keyword);
      if (score >= threshold) candidates.push({ rule, keyword, score, intent: ruleIntent(rule) });
    }
    const intent = ruleIntent(rule);
    if (intent) {
      for (const alias of synonymPacks[intent] ?? []) {
        const score = bestPhraseSimilarity(message, tokens, normalizeMessage(alias));
        if (score >= threshold) candidates.push({ rule, keyword: alias, score, intent });
      }
    }
  }
  candidates.sort((left, right) => right.score - left.score || compareRules(left.rule, right.rule));
  const winner = candidates[0];
  if (!winner) return null;
  const runnerUp = candidates.find((candidate) => candidate.rule.id !== winner.rule.id);
  // Ambiguous fuzzy signals always fall through to the human handoff path.
  if (runnerUp && winner.score - runnerUp.score < 0.05) return null;
  return publicMatch(winner.rule, winner.keyword, message, {
    match_mode: 'fuzzy',
    confidence: Number(winner.score.toFixed(3)),
    intent: winner.intent,
    alias_pack_version: synonymPacks.version,
    runner_up_confidence: runnerUp ? Number(runnerUp.score.toFixed(3)) : null,
  });
}

function bestPhraseSimilarity(message, tokens, phrase) {
  const normalizedPhrase = normalizeMessage(phrase);
  if (!normalizedPhrase) return 0;
  const phraseTokens = normalizedPhrase.split(' ');
  if (phraseTokens.length === 1) return Math.max(0, ...tokens.map((token) => fuzzySimilarity(token, normalizedPhrase)));
  const words = message.split(' ');
  if (words.length < phraseTokens.length) return 0;
  let best = 0;
  for (let index = 0; index <= words.length - phraseTokens.length; index += 1) {
    best = Math.max(best, fuzzySimilarity(words.slice(index, index + phraseTokens.length).join(' '), normalizedPhrase));
  }
  return best;
}

function detectIntent(message) {
  for (const intent of INTENTS) {
    if ((synonymPacks[intent] ?? []).some((alias) => matches(message, normalizeMessage(alias), 'word'))) return intent;
  }
  return null;
}

function ruleIntent(rule) {
  if (rule.intent) return rule.intent;
  for (const intent of INTENTS) {
    const aliases = synonymPacks[intent] ?? [];
    if (rule.keywords.some((keyword) => aliases.some((alias) => normalizeMessage(alias) === keyword))) return intent;
  }
  return null;
}

function publicMatch(rule, keyword, normalizedMessage, metadata) {
  const { _index, ...publicRule } = rule;
  return { rule: publicRule, keyword, normalized_message: normalizedMessage, ...metadata };
}

function matches(message, keyword, matchType) {
  if (matchType === 'exact') return message === keyword;
  if (matchType === 'word') return (` ${message} `).includes(` ${keyword} `);
  return message.includes(keyword);
}

function compareRules(left, right) {
  return right.priority - left.priority
    || MATCH_WEIGHT[right.match_type] - MATCH_WEIGHT[left.match_type]
    || longestKeyword(right) - longestKeyword(left)
    || left._index - right._index;
}

function longestKeyword(rule) {
  return rule.keywords.reduce((length, keyword) => Math.max(length, keyword.length), 0);
}

function validThreshold(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0.75 && parsed <= 0.95 ? parsed : DEFAULT_FUZZY_THRESHOLD;
}
