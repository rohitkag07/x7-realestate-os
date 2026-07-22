'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { BookCheck, Download, Loader2, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { KnowledgeBaseEditor } from '@/components/whatsai/KnowledgeBaseEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { knowledgeItemsInputSchema, type KnowledgeItemInput } from '@/lib/knowledge-schema';

type ApiItem = KnowledgeItemInput & { id: string; type: KnowledgeItemInput['kind']; is_active: boolean };

export function KnowledgeWorkspace() {
  const [items, setItems] = useState<KnowledgeItemInput[]>([]);
  const [business, setBusiness] = useState<{ id: string; name: string } | null>(null);
  const [playbookId, setPlaybookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const importInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsai/knowledge', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Knowledge could not be loaded.');
      setBusiness(payload.business);
      setPlaybookId(payload.playbook?.id ?? null);
      setItems((payload.items as ApiItem[]).map((item) => ({ ...item, kind: item.type })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Knowledge could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function save() {
    const parsed = knowledgeItemsInputSchema.safeParse(items);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Complete each knowledge answer before saving.');
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch('/api/whatsai/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: business?.id, playbook_id: playbookId, items: parsed.data }) });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'Knowledge could not be saved.');
        setItems((payload.items as ApiItem[]).map((item) => ({ ...item, kind: item.type })));
        toast.success('Business knowledge published.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Knowledge could not be saved.');
      }
    });
  }

  async function importOkf(file?: File) {
    if (!file) return;
    try {
      const response = await fetch('/api/whatsai/knowledge/okf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await file.text() });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'OKF import failed.');
      setItems(payload.items);
      toast.success('OKF bundle loaded. Review and save to publish it.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'OKF import failed.');
    }
  }

  const counts = useMemo(() => ({ published: items.filter((item) => item.status === 'published').length, draft: items.filter((item) => item.status === 'draft').length, total: items.length }), [items]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-[#e9edef]" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Published answers" value={counts.published} />
        <Metric label="Drafts to review" value={counts.draft} />
        <Metric label="Total knowledge" value={counts.total} />
      </div>
      <Card className="border-[#d8dee4]"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="flex items-center gap-2 font-semibold text-[#111b21]"><BookCheck className="h-5 w-5 text-[#00a884]" />{business?.name ?? 'Business knowledge'}</div><p className="mt-1 text-sm text-[#667781]">Owner-approved answers are used immediately after publishing.</p></div><div className="flex flex-wrap gap-2"><input ref={importInput} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void importOkf(event.target.files?.[0]); event.currentTarget.value = ''; }} /><Button variant="outline" onClick={() => importInput.current?.click()}><Upload className="mr-2 h-4 w-4" />Import OKF</Button><Button variant="outline" asChild><a href="/api/whatsai/knowledge/okf" download><Download className="mr-2 h-4 w-4" />Export OKF</a></Button><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></div></CardContent></Card>
      <KnowledgeBaseEditor items={items} onChange={setItems} />
      <div className="sticky bottom-4 flex justify-end"><Button size="lg" className="bg-[#00a884] hover:bg-[#008f72]" onClick={save} disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCheck className="mr-2 h-4 w-4" />}Save knowledge</Button></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-[#d8dee4] bg-white p-5"><div className="text-2xl font-semibold tracking-tight text-[#111b21]">{value}</div><div className="mt-1 text-sm text-[#667781]">{label}</div></div>;
}
