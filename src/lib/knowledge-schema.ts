import { z } from 'zod';
import { interactiveReplyButtonsSchema } from '@/lib/whatsapp-interactive-schema';

export const knowledgeKinds = ['faq', 'service', 'pricing', 'policy', 'location', 'offer', 'document', 'other'] as const;
export const knowledgeLocales = ['en-IN', 'hi-IN', 'hinglish'] as const;
export const knowledgeStatuses = ['draft', 'published', 'archived'] as const;
export const knowledgeSourceTypes = ['manual', 'website', 'document', 'okf'] as const;

export const knowledgeItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  kind: z.enum(knowledgeKinds),
  question: z.string().trim().max(280).optional().nullable(),
  content: z.string().trim().min(2).max(4000),
  keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  locale: z.enum(knowledgeLocales).default('hinglish'),
  status: z.enum(knowledgeStatuses).default('draft'),
  okf_slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  source_type: z.enum(knowledgeSourceTypes).default('manual'),
  source_url: z.string().trim().url().max(1000).optional().nullable(),
  media_url: z.string().trim().url().max(1000).optional().nullable(),
  interactive_buttons: interactiveReplyButtonsSchema.default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const knowledgeItemsInputSchema = z.array(knowledgeItemInputSchema).max(100);

export type KnowledgeItemInput = z.infer<typeof knowledgeItemInputSchema>;

export function slugifyKnowledgeTitle(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'knowledge-entry';
}

export function normalizeKnowledgeKeywords(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLocaleLowerCase('en-IN')).filter(Boolean))].slice(0, 30);
}

export function createKnowledgeDraft(index = 1): KnowledgeItemInput {
  return {
    title: `Business answer ${index}`,
    kind: 'faq',
    question: '',
    content: '',
    keywords: [],
    locale: 'hinglish',
    status: 'draft',
    source_type: 'manual',
    source_url: null,
    media_url: null,
    interactive_buttons: [],
    metadata: {},
  };
}
