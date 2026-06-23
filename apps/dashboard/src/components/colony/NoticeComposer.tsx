'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Megaphone, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NoticeComposerProps {
  projectId: string;
  builderId: string;
  triggerLabel?: string;
}

export function NoticeComposer({ projectId, builderId, triggerLabel = 'Compose Notice' }: NoticeComposerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    project_id: projectId,
    builder_id: builderId,
    title: '',
    body: '',
    body_hindi: '',
    category: 'general',
    target: 'all',
    send_now: true,
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      project_id: projectId,
      builder_id: builderId,
    }));
  }, [projectId, builderId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error('Title and body required');
    start(async () => {
      try {
        const res = await fetch('/api/colony/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const j = await res.json();
        if (!res.ok && res.status !== 207) throw new Error(j.error?.formErrors?.join(', ') ?? j.error ?? res.statusText);
        toast.success(form.send_now ? `Broadcast: ${j.broadcast?.delivered ?? 0} delivered` : 'Saved as draft');
        setOpen(false); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Send className="h-4 w-4 mr-2" /> {triggerLabel}</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-500" /> Compose Notice</DialogTitle>
            <DialogDescription>Broadcast to residents via WhatsApp. Hindi primary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Water cut Sunday 8 AM" /></div>
            <div className="space-y-1.5"><Label htmlFor="bh">Body (Hindi)</Label><Textarea id="bh" rows={2} value={form.body_hindi} onChange={(e) => setForm({ ...form, body_hindi: e.target.value })} placeholder="हिंदी में सूचना…" /></div>
            <div className="space-y-1.5"><Label htmlFor="b">Body (English)</Label><Textarea id="b" rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['general','maintenance','emergency','event','poll','payment','warning'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Target</Label><Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['all','owners','tenants','block','floor','custom'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.send_now} onChange={(e) => setForm({ ...form, send_now: e.target.checked })} /><span>Send immediately</span></label>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Sending…' : (form.send_now ? 'Broadcast' : 'Save Draft')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
