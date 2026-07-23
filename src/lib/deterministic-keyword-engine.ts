import synonymPacksJson from '../../shared/hinglish-synonyms.json';
import type { KeywordReplyRule } from '@/types/database';

type MatchMode = 'direct' | 'synonym' | 'fuzzy' | 'button_payload';

export type KeywordMatch = {
  rule: KeywordReplyRule;
  keyword: string;
  normalizedMessage: string;
  matchMode: MatchMode;
  confidence: number;
  intent: string | null;
};

type PreparedRule = KeywordReplyRule & {
  index: number;
  fuzzyEnabled: boolean;
  fuzzyThreshold: number;
};

type SynonymPacks = {
  version?: string;
  price?: string[];
  location?: string[];
  timing?: string[];
  booking?: string[];
  offers?: string[];
};

const synonymPacks = synonymPacksJson as SynonymPacks;
const intents = ['price', 'location', 'timing', 'booking', 'offers'] as const;
const matchWeight = { exact: 3, word: 2, contains: 1 } as const;
const defaultFuzzyThreshold = 0.82;
const minFuzzyTokenLength = 4;

export function normalizeMessage(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/(.)\1{2,}/gu, '$1$1')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findKeywordReply(
  message: string,
  rules: KeywordReplyRule[],
  buttonPayload?: string | null,
): KeywordMatch | null {
  const prepared = prepareRules(rules);
  const payloadMatch = buttonPayload ? matchButtonPayload(buttonPayload, prepared) : null;
  if (payloadMatch) return payloadMatch;

  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return null;

  for (const rule of prepared) {
    for (const keyword of rule.keywords) {
      if (matches(normalizedMessage, keyword, rule.match_type)) {
        return toMatch(rule, keyword, normalizedMessage, 'direct', 1);
      }
    }
  }

  const intent = detectIntent(normalizedMessage);
  if (intent) {
    const rule = prepared.find((candidate) => ruleIntent(candidate) === intent);
    if (rule) return toMatch(rule, intent, normalizedMessage, 'synonym', 0.96, intent);
  }

  return fuzzyMatch(normalizedMessage, prepared);
}

export function damerauLevenshtein(left: string, right: string) {
  const a = normalizeMessage(left);
  const b = normalizeMessage(right);
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
      if (
        row > 1
        && column > 1
        && a[row - 1] === b[column - 2]
        && a[row - 2] === b[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
      }
    }
  }

  return matrix[a.length][b.length];
}

export function fuzzySimilarity(left: string, right: string) {
  const longest = Math.max(normalizeMessage(left).length, normalizeMessage(right).length, 1);
  return 1 - damerauLevenshtein(left, right) / longest;
}

function prepareRules(rules: KeywordReplyRule[]): PreparedRule[] {
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule, index): PreparedRule => ({
      ...rule,
      id: String(rule.id || `rule-${index + 1}`),
      label: String(rule.label || `Rule ${index + 1}`),
      keywords: [...new Set((rule.keywords ?? []).map(normalizeMessage).filter(Boolean))],
      reply: String(rule.reply || '').trim(),
      priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : 0,
      match_type: ['exact', 'word', 'contains'].includes(rule.match_type) ? rule.match_type : 'contains',
      enabled: rule.enabled !== false,
      handoff: rule.handoff === true,
      index,
      fuzzyEnabled: rule.fuzzy_enabled !== false,
      fuzzyThreshold: validThreshold(rule.fuzzy_threshold),
    }))
    .filter((rule) => rule.enabled && rule.reply && rule.keywords.length > 0)
    .sort(compareRules);
}

function matchButtonPayload(payload: string, rules: PreparedRule[]) {
  const value = String(payload || '').trim();
  if (!value) return null;
  if (value.startsWith('rule:')) {
    const rule = rules.find((candidate) => candidate.id === value.slice('rule:'.length));
    return rule ? toMatch(rule, value, normalizeMessage(value), 'button_payload', 1) : null;
  }
  const keyword = value.startsWith('keyword:') ? value.slice('keyword:'.length) : value;
  return findKeywordReply(keyword, rules);
}

function fuzzyMatch(message: string, rules: PreparedRule[]): KeywordMatch | null {
  if (process.env.HINGLISH_FUZZY_MATCHING_ENABLED === 'false') return null;

  const tokens = message.split(' ').filter((token) => token.length >= minFuzzyTokenLength);
  const candidates: Array<{
    rule: PreparedRule;
    keyword: string;
    score: number;
    intent: string | null;
  }> = [];

  for (const rule of rules) {
    if (!rule.fuzzyEnabled) continue;
    for (const keyword of rule.keywords) {
      const score = bestPhraseSimilarity(message, tokens, keyword);
      if (score >= rule.fuzzyThreshold) {
        candidates.push({ rule, keyword, score, intent: ruleIntent(rule) });
      }
    }

    const intent = ruleIntent(rule);
    if (intent) {
      for (const alias of aliasesForIntent(intent)) {
        const score = bestPhraseSimilarity(message, tokens, normalizeMessage(alias));
        if (score >= rule.fuzzyThreshold) candidates.push({ rule, keyword: alias, score, intent });
      }
    }
  }

  candidates.sort((left, right) => right.score - left.score || compareRules(left.rule, right.rule));
  const winner = candidates[0];
  if (!winner) return null;
  const runnerUp = candidates.find((candidate) => candidate.rule.id !== winner.rule.id);
  if (runnerUp && winner.score - runnerUp.score < 0.05) return null;

  return toMatch(
    winner.rule,
    winner.keyword,
    message,
    'fuzzy',
    Number(winner.score.toFixed(3)),
    winner.intent,
  );
}

function bestPhraseSimilarity(message: string, tokens: string[], phrase: string) {
  const normalizedPhrase = normalizeMessage(phrase);
  if (!normalizedPhrase) return 0;
  const phraseTokens = normalizedPhrase.split(' ');
  if (phraseTokens.length === 1) {
    return Math.max(0, ...tokens.map((token) => fuzzySimilarity(token, normalizedPhrase)));
  }

  const words = message.split(' ');
  if (words.length < phraseTokens.length) return 0;
  let best = 0;
  for (let index = 0; index <= words.length - phraseTokens.length; index += 1) {
    best = Math.max(
      best,
      fuzzySimilarity(words.slice(index, index + phraseTokens.length).join(' '), normalizedPhrase),
    );
  }
  return best;
}

function detectIntent(message: string) {
  for (const intent of intents) {
    if ((synonymPacks[intent] ?? []).some((alias) => matches(message, normalizeMessage(alias), 'word'))) {
      return intent;
    }
  }
  return null;
}

function ruleIntent(rule: PreparedRule) {
  if (rule.intent && (intents as readonly string[]).includes(rule.intent)) return rule.intent;
  for (const intent of intents) {
    if (
      rule.keywords.some((keyword) =>
        (synonymPacks[intent] ?? []).some((alias) => normalizeMessage(alias) === keyword),
      )
    ) {
      return intent;
    }
  }
  return null;
}

function aliasesForIntent(intent: string) {
  if (!(intents as readonly string[]).includes(intent)) return [];
  return synonymPacks[intent as (typeof intents)[number]] ?? [];
}

function matches(message: string, keyword: string, matchType: KeywordReplyRule['match_type']) {
  if (matchType === 'exact') return message === keyword;
  if (matchType === 'word') return (` ${message} `).includes(` ${keyword} `);
  return message.includes(keyword);
}

function compareRules(left: PreparedRule, right: PreparedRule) {
  return right.priority - left.priority
    || matchWeight[right.match_type] - matchWeight[left.match_type]
    || longestKeyword(right) - longestKeyword(left)
    || left.index - right.index;
}

function longestKeyword(rule: PreparedRule) {
  return rule.keywords.reduce((length, keyword) => Math.max(length, keyword.length), 0);
}

function validThreshold(value: number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0.75 && parsed <= 0.95
    ? parsed
    : defaultFuzzyThreshold;
}

function toMatch(
  rule: PreparedRule,
  keyword: string,
  normalizedMessage: string,
  matchMode: MatchMode,
  confidence: number,
  intent: string | null = ruleIntent(rule),
): KeywordMatch {
  const publicRule = { ...rule } as Partial<PreparedRule>;
  delete publicRule.index;
  delete publicRule.fuzzyEnabled;
  delete publicRule.fuzzyThreshold;
  return {
    rule: publicRule as KeywordReplyRule,
    keyword,
    normalizedMessage,
    matchMode,
    confidence,
    intent,
  };
}
