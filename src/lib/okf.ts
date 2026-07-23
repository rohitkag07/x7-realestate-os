import type { AssistantKnowledgeItem } from '@/types/database';
import type { KnowledgeItemInput } from '@/lib/knowledge-schema';

export type OkfBundle = {
  format: 'google-open-knowledge-format';
  version: '0.1';
  exported_at: string;
  business: { id: string; name: string };
  files: Array<{ path: string; content: string }>;
};

export function buildOkfBundle(business: { id: string; name: string }, items: AssistantKnowledgeItem[]): OkfBundle {
  return {
    format: 'google-open-knowledge-format',
    version: '0.1',
    exported_at: new Date().toISOString(),
    business,
    files: items.map((item) => ({
      path: `knowledge/${item.okf_slug}.md`,
      content: serializeKnowledgeItem(item),
    })),
  };
}

export function serializeKnowledgeItem(item: AssistantKnowledgeItem) {
  const frontmatter = [
    '---',
    `title: ${yamlString(item.title)}`,
    `kind: ${item.type}`,
    `business_id: ${item.business_id}`,
    `playbook_id: ${item.playbook_id ?? ''}`,
    `locale: ${item.locale}`,
    `status: ${item.status}`,
    `okf_slug: ${item.okf_slug}`,
    `source_type: ${item.source_type}`,
    `source_url: ${yamlString(item.source_url ?? '')}`,
    `question: ${yamlString(item.question ?? '')}`,
    'keywords:',
    ...item.keywords.map((keyword) => `  - ${yamlString(keyword)}`),
    `last_reviewed_at: ${item.last_reviewed_at ?? ''}`,
    '---',
  ];
  return `${frontmatter.join('\n')}\n\n${item.content.trim()}\n`;
}

export function parseOkfBundle(bundle: unknown): KnowledgeItemInput[] {
  if (!isRecord(bundle) || bundle.format !== 'google-open-knowledge-format' || !Array.isArray(bundle.files)) {
    throw new Error('invalid_okf_bundle');
  }
  return bundle.files.map((file) => {
    if (!isRecord(file) || typeof file.content !== 'string') throw new Error('invalid_okf_file');
    return parseKnowledgeMarkdown(file.content);
  });
}

function parseKnowledgeMarkdown(content: string): KnowledgeItemInput {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('invalid_okf_frontmatter');
  const lines = match[1].split('\n');
  const values: Record<string, string> = {};
  const keywords: string[] = [];
  let collectingKeywords = false;

  for (const line of lines) {
    if (line === 'keywords:') {
      collectingKeywords = true;
      continue;
    }
    if (collectingKeywords && line.startsWith('  - ')) {
      keywords.push(unquote(line.slice(4)));
      continue;
    }
    collectingKeywords = false;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    values[line.slice(0, separator).trim()] = unquote(line.slice(separator + 1).trim());
  }

  return {
    title: values.title || 'Imported knowledge',
    kind: (values.kind || 'other') as KnowledgeItemInput['kind'],
    question: values.question || null,
    content: match[2].trim(),
    keywords,
    locale: (values.locale || 'hinglish') as KnowledgeItemInput['locale'],
    status: (values.status || 'draft') as KnowledgeItemInput['status'],
    okf_slug: values.okf_slug || undefined,
    source_type: 'okf',
    source_url: values.source_url || null,
    media_url: null,
    interactive_buttons: [],
    metadata: { imported_from_okf: true },
  };
}

function yamlString(value: string) {
  return JSON.stringify(value);
}

function unquote(value: string) {
  if (!value.startsWith('"')) return value;
  try {
    return JSON.parse(value) as string;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
