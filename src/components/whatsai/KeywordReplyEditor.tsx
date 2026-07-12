'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircleReply, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { matchKeywordReply } from '@/lib/keyword-reply-schema';
import type { KeywordReplyRule } from '@/types/database';

type Props = {
  rules: KeywordReplyRule[];
  fallbackReply: string;
  onRulesChange: (rules: KeywordReplyRule[]) => void;
  onFallbackReplyChange: (value: string) => void;
};

export function KeywordReplyEditor({ rules, fallbackReply, onRulesChange, onFallbackReplyChange }: Props) {
  const [testMessage, setTestMessage] = useState('');
  const match = useMemo(() => matchKeywordReply(testMessage, rules), [rules, testMessage]);

  function updateRule(id: string, patch: Partial<KeywordReplyRule>) {
    onRulesChange(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  }

  function addRule() {
    const suffix = rules.length + 1;
    onRulesChange([...rules, {
      id: uniqueId(`reply-${suffix}`, rules), label: `Reply ${suffix}`, keywords: [], match_type: 'word',
      reply: '', priority: Math.max(0, 100 - rules.length), enabled: true, handoff: false,
    }]);
  }

  return <div className="space-y-5">
    <div className="rounded-3xl border border-[#b7efc5] bg-[#f4fff6] p-5">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00a884] text-white"><MessageCircleReply className="h-5 w-5" /></div><div><h3 className="font-semibold text-[#111b21]">Keywords & exact replies</h3><p className="mt-1 text-sm leading-relaxed text-[#667781]">Add words customers commonly send and the exact reply WhatsAI should return. No generated text is used.</p></div></div>
    </div>

    <div className="space-y-4">{rules.map((rule, index) => <RuleCard key={rule.id} rule={rule} index={index} onChange={(patch) => updateRule(rule.id, patch)} onDelete={() => onRulesChange(rules.filter((item) => item.id !== rule.id))} />)}</div>

    <Button type="button" variant="outline" className="w-full border-dashed border-[#00a884] text-[#075e54] hover:bg-[#e7fce3]" onClick={addRule} disabled={rules.length >= 30}><Plus className="mr-2 h-4 w-4" />Add another reply</Button>

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="fallback-reply">Fallback reply</Label><Textarea id="fallback-reply" value={fallbackReply} onChange={(event) => onFallbackReplyChange(event.target.value)} rows={5} placeholder="Thanks for your message. Our team will reply shortly." /><p className="text-xs text-muted-foreground">Sent when no keyword matches. The conversation is also handed to the owner.</p></div>
      <div className="rounded-3xl border border-[#d8dee4] bg-[#f0f2f5] p-4"><Label htmlFor="keyword-tester" className="flex items-center gap-2"><Search className="h-4 w-4 text-[#00a884]" />Live tester</Label><Input id="keyword-tester" className="mt-3 bg-white" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Type a customer message, e.g. fees kya hai" /><div className="mt-3 min-h-28 rounded-2xl bg-[#efeae2] p-3">{testMessage.trim() ? <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm shadow-sm">{match?.reply ?? fallbackReply}<div className="mt-2 flex items-center justify-between text-[10px] text-[#667781]"><span>{match ? `Matched: ${match.label}` : 'Fallback reply'}</span><CheckCircle2 className="h-3 w-3" /></div></div> : <p className="p-3 text-center text-xs text-[#667781]">Your matched reply appears here.</p>}</div></div>
    </div>
  </div>;
}

function RuleCard({ rule, index, onChange, onDelete }: { rule: KeywordReplyRule; index: number; onChange: (patch: Partial<KeywordReplyRule>) => void; onDelete: () => void }) {
  const [keywordDraft, setKeywordDraft] = useState('');

  function commitKeywords(raw: string) {
    const incoming = raw.split(',').map((value) => value.trim()).filter(Boolean);
    if (!incoming.length) return;
    onChange({ keywords: [...new Set([...rule.keywords, ...incoming])].slice(0, 20) });
    setKeywordDraft('');
  }

  return <div className="rounded-3xl border border-[#d8dee4] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wide text-[#00a884]">Rule {index + 1}</div><h4 className="mt-1 font-semibold text-[#111b21]">{rule.label || 'Untitled reply'}</h4></div><Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${rule.label}`}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
      <div className="space-y-2"><Label>Rule name</Label><Input value={rule.label} onChange={(event) => onChange({ label: event.target.value, id: slugify(event.target.value) || rule.id })} placeholder="Fees" /></div>
      <div className="space-y-2"><Label>Match type</Label><Select value={rule.match_type} onValueChange={(value) => onChange({ match_type: value as KeywordReplyRule['match_type'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="word">Whole word</SelectItem><SelectItem value="exact">Exact message</SelectItem><SelectItem value="contains">Contains phrase</SelectItem></SelectContent></Select></div>
    </div>
    <div className="mt-4 space-y-2"><Label>Keywords</Label><Input value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commitKeywords(keywordDraft); } }} onBlur={() => commitKeywords(keywordDraft)} placeholder="Type a keyword and press Enter" /><div className="flex min-h-7 flex-wrap gap-2">{rule.keywords.map((keyword) => <Badge key={keyword} variant="secondary" className="gap-1 bg-[#e7fce3] text-[#075e54]">{keyword}<button type="button" onClick={() => onChange({ keywords: rule.keywords.filter((item) => item !== keyword) })} aria-label={`Remove ${keyword}`}><X className="h-3 w-3" /></button></Badge>)}</div></div>
    <div className="mt-4 space-y-2"><Label>Exact reply</Label><Textarea value={rule.reply} onChange={(event) => onChange({ reply: event.target.value })} rows={4} placeholder="Our monthly fee is Rs 1,500. Would you like to book a visit?" /></div>
    <div className="mt-4 flex flex-wrap gap-5 text-sm"><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={rule.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} className="h-4 w-4 accent-[#00a884]" />Active</label><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={rule.handoff} onChange={(event) => onChange({ handoff: event.target.checked })} className="h-4 w-4 accent-[#f59e0b]" />Alert owner after reply</label></div>
  </div>;
}

function slugify(value: string) { return value.toLocaleLowerCase('en-IN').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function uniqueId(candidate: string, rules: KeywordReplyRule[]) { let value = candidate; let suffix = 2; while (rules.some((rule) => rule.id === value)) value = `${candidate}-${suffix++}`; return value; }
