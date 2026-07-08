'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEMO_PROJECT_ID = '22222222-2222-2222-2222-222222222222';
const DEMO_BUILDER_ID = '11111111-1111-1111-1111-111111111111';

export function GenerateCalendarDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [projectId, setProjectId] = useState(DEMO_PROJECT_ID);
  const [builderId, setBuilderId] = useState(DEMO_BUILDER_ID);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !builderId) return toast.error('Business ID and offer ID required');
    start(async () => {
      try {
        const res = await fetch('/api/content/calendar/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ builder_id: builderId, project_id: projectId, month }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.formErrors?.join(', ') ?? json?.error ?? res.statusText);
        if (json.source === 'fallback') {
          toast.message('Content agent offline', { description: json.note });
        } else {
          toast.success(`${json.count ?? 0} content pieces queued for the next 30 days`);
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-2" /> Generate Calendar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /> Generate 30-Day Calendar</DialogTitle>
            <DialogDescription>GPT-4o builds a balanced pillar mix; drafts auto-render via Remotion / Higgsfield.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="builder_id">Business ID</Label>
              <Input id="builder_id" value={builderId} onChange={(e) => setBuilderId(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project_id">Offer ID</Label>
              <Input id="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month">Month</Label>
              <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Generating…' : 'Generate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
