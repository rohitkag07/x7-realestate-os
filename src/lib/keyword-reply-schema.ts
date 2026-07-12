import { z } from 'zod';
import type { KeywordReplyRule } from '@/types/database';

export const keywordReplyRuleSchema = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
  label: z.string().trim().min(1).max(60),
  keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  match_type: z.enum(['word', 'exact', 'contains']).default('word'),
  reply: z.string().trim().min(1).max(1000),
  priority: z.number().int().min(0).max(1000).default(100),
  enabled: z.boolean().default(true),
  handoff: z.boolean().default(false),
  intent: z.enum(['price', 'location', 'timing', 'booking', 'offers']).optional(),
  fuzzy_enabled: z.boolean().default(true),
  fuzzy_threshold: z.number().min(0.75).max(0.95).default(0.82),
  media_asset_id: z.string().uuid().optional(),
  media_storage_path: z.string().trim().min(1).max(500).optional(),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video', 'document']).optional(),
  media_name: z.string().trim().min(1).max(180).optional(),
  media_mime_type: z.enum(['image/jpeg', 'image/png', 'video/mp4', 'application/pdf']).optional(),
  media_size_bytes: z.number().int().positive().max(16 * 1024 * 1024).optional(),
}).superRefine((rule, context) => {
  const hasMedia = Boolean(rule.media_asset_id || rule.media_storage_path || rule.media_url);
  if (hasMedia && !rule.media_type) context.addIssue({ code: z.ZodIssueCode.custom, path: ['media_type'], message: 'Choose the attachment type.' });
  if (rule.media_type && !hasMedia) context.addIssue({ code: z.ZodIssueCode.custom, path: ['media_asset_id'], message: 'Attach a file before choosing media.' });
  if (rule.media_type === 'image' && rule.media_mime_type && !['image/jpeg', 'image/png'].includes(rule.media_mime_type)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['media_mime_type'], message: 'Images must be JPEG or PNG.' });
  if (rule.media_type === 'video' && rule.media_mime_type && rule.media_mime_type !== 'video/mp4') context.addIssue({ code: z.ZodIssueCode.custom, path: ['media_mime_type'], message: 'Videos must be MP4.' });
  if (rule.media_type === 'document' && rule.media_mime_type && rule.media_mime_type !== 'application/pdf') context.addIssue({ code: z.ZodIssueCode.custom, path: ['media_mime_type'], message: 'Documents must be PDF.' });
});

export const keywordRepliesSchema = z.array(keywordReplyRuleSchema).max(30).superRefine((rules, context) => {
  const ids = new Set<string>();
  const keywordOwners = new Map<string, string>();

  rules.forEach((rule, index) => {
    if (ids.has(rule.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'id'], message: 'Rule IDs must be unique.' });
    }
    ids.add(rule.id);

    if (!rule.enabled) return;
    rule.keywords.forEach((keyword) => {
      const normalized = normalizeKeywordText(keyword);
      const existing = keywordOwners.get(normalized);
      if (existing && existing !== rule.id) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'keywords'], message: `Keyword "${keyword}" is already used by ${existing}.` });
      }
      keywordOwners.set(normalized, rule.id);
    });
  });
});

export const fallbackReplySchema = z.string().trim().min(1).max(1000);

export const keywordPlaybookInputSchema = z.object({
  keyword_replies: keywordRepliesSchema,
  fallback_reply: fallbackReplySchema,
  qualification_questions: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
});

export function normalizeKeywordText(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchKeywordReply(message: string, rules: KeywordReplyRule[]) {
  const normalizedMessage = normalizeKeywordText(message);
  const sorted = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => rule.enabled)
    .sort((left, right) => (
      right.rule.priority - left.rule.priority
      || specificity(right.rule.match_type) - specificity(left.rule.match_type)
      || longestKeyword(right.rule) - longestKeyword(left.rule)
      || left.index - right.index
    ));

  return sorted.find(({ rule }) => rule.keywords.some((keyword) => matches(normalizedMessage, normalizeKeywordText(keyword), rule.match_type)))?.rule ?? null;
}

function matches(message: string, keyword: string, matchType: KeywordReplyRule['match_type']) {
  if (!message || !keyword) return false;
  if (matchType === 'exact') return message === keyword;
  if (matchType === 'contains') return message.includes(keyword);
  return (` ${message} `).includes(` ${keyword} `);
}

function specificity(matchType: KeywordReplyRule['match_type']) {
  return matchType === 'exact' ? 3 : matchType === 'word' ? 2 : 1;
}

function longestKeyword(rule: KeywordReplyRule) {
  return rule.keywords.reduce((length, keyword) => Math.max(length, normalizeKeywordText(keyword).length), 0);
}
