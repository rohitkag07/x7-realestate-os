'use client';

import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ExternalLink, FileQuestion, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createKnowledgeDraft, normalizeKnowledgeKeywords, slugifyKnowledgeTitle, type KnowledgeItemInput } from '@/lib/knowledge-schema';

type Props = {
  items: KnowledgeItemInput[];
  onChange: (items: KnowledgeItemInput[]) => void;
  compact?: boolean;
};

export function KnowledgeBaseEditor({ items, onChange, compact = false }: Props) {
  const [testMessage, setTestMessage] = useState('');
  const match = useMemo(() => findPreviewMatch(testMessage, items), [items, testMessage]);
  const publishedCount = items.filter((item) => item.status === 'published').length;

  function addItem() {
    onChange([...items, { ...createKnowledgeDraft(items.length + 1), status: 'published' }]);
  }

  function updateItem(index: number, patch: Partial<KnowledgeItemInput>) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#b7efc5] bg-[#f4fff6] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#075e54] text-white"><BookOpen className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-[#111b21]">Owner-approved business knowledge</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#667781]">Add the facts customers ask about: services, prices, location, policies, and offers. WhatsAI sends only the exact answer you approve.</p>
            </div>
          </div>
          <Badge className="w-fit bg-[#d9fdd3] text-[#075e54] hover:bg-[#d9fdd3]">{publishedCount} published</Badge>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <KnowledgeCard
              key={item.id ?? `${item.okf_slug ?? 'draft'}-${index}`}
              item={item}
              index={index}
              compact={compact}
              onChange={(patch) => updateItem(index, patch)}
              onDelete={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#b8c5c1] bg-white px-6 py-10 text-center">
          <FileQuestion className="mx-auto h-9 w-9 text-[#00a884]" />
          <h3 className="mt-3 font-semibold text-[#111b21]">Build your first business answer</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#667781]">Start with the question customers ask most often. You can add or update answers at any time.</p>
        </div>
      )}

      <Button type="button" variant="outline" className="w-full border-dashed border-[#00a884] text-[#075e54] hover:bg-[#e7fce3]" onClick={addItem} disabled={items.length >= 100}>
        <Plus className="mr-2 h-4 w-4" />Add knowledge answer
      </Button>

      <div className="rounded-3xl border border-[#d8dee4] bg-[#f0f2f5] p-4 sm:p-5">
        <Label htmlFor="knowledge-tester" className="flex items-center gap-2"><Search className="h-4 w-4 text-[#00a884]" />Test your knowledge</Label>
        <Input id="knowledge-tester" className="mt-3 bg-white" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Try: clinic kaha hai, fees kya hai, Sunday open ho?" />
        <div className="mt-3 min-h-24 rounded-2xl bg-[#efeae2] p-3">
          {!testMessage.trim() ? <p className="p-3 text-center text-xs text-[#667781]">The approved answer and source will appear here.</p> : match ? (
            <div className="ml-auto max-w-[94%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm shadow-sm">
              {match.content}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#667781]"><span>Source: {match.title}</span><span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Owner approved</span></div>
            </div>
          ) : <p className="p-3 text-center text-xs font-medium text-[#9a6700]">No published answer matched. WhatsAI will hand this chat to the owner.</p>}
        </div>
      </div>
    </div>
  );
}

function KnowledgeCard({ item, index, compact, onChange, onDelete }: { item: KnowledgeItemInput; index: number; compact: boolean; onChange: (patch: Partial<KnowledgeItemInput>) => void; onDelete: () => void }) {
  const [keywordDraft, setKeywordDraft] = useState('');
  const ready = item.title.trim().length >= 2 && item.content.trim().length >= 2 && item.keywords.length > 0;
  const commitKeywords = () => {
    const incoming = keywordDraft.split(',').map((value) => value.trim()).filter(Boolean);
    if (incoming.length) onChange({ keywords: normalizeKnowledgeKeywords([...item.keywords, ...incoming]) });
    setKeywordDraft('');
  };

  return (
    <div className={`rounded-3xl border bg-white p-4 shadow-sm sm:p-5 ${ready ? 'border-[#d8dee4]' : 'border-[#f0bd42]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-semibold uppercase tracking-wide text-[#00a884]">Knowledge {index + 1}</div><h4 className="mt-1 font-semibold text-[#111b21]">{item.title || 'Untitled answer'}</h4></div>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_170px_150px]">
        <Field label="Answer title"><Input value={item.title} onChange={(event) => onChange({ title: event.target.value, okf_slug: item.id ? item.okf_slug : slugifyKnowledgeTitle(event.target.value) })} placeholder="Consultation fees" /></Field>
        <Field label="Information type"><Select value={item.kind} onValueChange={(value) => onChange({ kind: value as KnowledgeItemInput['kind'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['faq', 'service', 'pricing', 'policy', 'location', 'offer', 'document', 'other'].map((kind) => <SelectItem key={kind} value={kind}>{titleCase(kind)}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="State"><Select value={item.status} onValueChange={(value) => onChange({ status: value as KnowledgeItemInput['status'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published" disabled={!ready}>Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></Field>
      </div>
      <div className={`mt-4 grid gap-4 ${compact ? '' : 'lg:grid-cols-2'}`}>
        <Field label="Customer question"><Input value={item.question ?? ''} onChange={(event) => onChange({ question: event.target.value })} placeholder="What is your consultation fee?" /></Field>
        <Field label="Search words and Hinglish variants"><Input value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} onBlur={commitKeywords} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commitKeywords(); } }} placeholder="fees, charge, kitna lagega" /></Field>
      </div>
      <div className="mt-2 flex min-h-7 flex-wrap gap-2">{item.keywords.map((keyword) => <Badge key={keyword} variant="secondary" className="bg-[#e7fce3] text-[#075e54]"><button type="button" onClick={() => onChange({ keywords: item.keywords.filter((value) => value !== keyword) })}>{keyword} ×</button></Badge>)}</div>
      <div className="mt-4"><Field label="Exact approved answer"><Textarea rows={4} value={item.content} onChange={(event) => onChange({ content: event.target.value })} placeholder="Our consultation fee is Rs 500. We are open Monday to Saturday, 10 AM to 7 PM." /></Field></div>
      {!compact ? <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]"><Field label="Language"><Select value={item.locale} onValueChange={(value) => onChange({ locale: value as KnowledgeItemInput['locale'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hinglish">Hinglish</SelectItem><SelectItem value="en-IN">English</SelectItem><SelectItem value="hi-IN">Hindi</SelectItem></SelectContent></Select></Field><Field label="Source URL (optional)"><div className="relative"><Input className="pr-10" value={item.source_url ?? ''} onChange={(event) => onChange({ source_url: event.target.value || null, source_type: event.target.value ? 'website' : 'manual' })} placeholder="https://yourbusiness.com/pricing" />{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="absolute right-3 top-2.5 text-[#00a884]" aria-label="Open source"><ExternalLink className="h-4 w-4" /></a> : null}</div></Field></div> : null}
      {!ready ? <p className="mt-3 text-xs font-medium text-[#9a6700]">Add a title, at least one search keyword, and the approved answer before publishing.</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function findPreviewMatch(message: string, items: KnowledgeItemInput[]) {
  const normalized = normalize(message);
  if (!normalized) return null;
  return items.filter((item) => item.status === 'published').find((item) => item.keywords.some((keyword) => normalized.includes(normalize(keyword)))) ?? null;
}

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('en-IN').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value: string) {
  return value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
