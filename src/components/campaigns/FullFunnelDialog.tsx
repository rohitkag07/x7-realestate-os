'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Megaphone, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FullFunnelDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [projectId, setProjectId] = useState('22222222-2222-2222-2222-222222222222');
  const [builderId, setBuilderId] = useState('11111111-1111-1111-1111-111111111111');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !builderId) return toast.error('Builder + Project ID required');
    start(async () => {
      try {
        const res = await fetch('/api/campaigns/full-funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ builder_id: builderId, project_id: projectId }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.formErrors?.join(', ') ?? json.error ?? res.statusText);
        const ok = (json.campaigns ?? []).filter((c: any) => c?.ok).length;
        toast.success(`${ok}/${(json.campaigns ?? []).length} campaigns provisioned`);
        setOpen(false); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Campaign</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-500" /> Provision Full Funnel</DialogTitle>
            <DialogDescription>Creates Awareness + Consideration + Click-to-WhatsApp + Retargeting in Meta Ads, all paused.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="b">Builder ID</Label><Input id="b" value={builderId} onChange={(e) => setBuilderId(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="p">Project ID</Label><Input id="p" value={projectId} onChange={(e) => setProjectId(e.target.value)} required /></div>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Provisioning…' : 'Provision'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
