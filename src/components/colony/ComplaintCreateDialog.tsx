'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Wrench } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ComplaintPriority, Resident } from '@/types/database';

interface ComplaintCreateDialogProps {
  residents: Resident[];
}

export function ComplaintCreateDialog({ residents }: ComplaintCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const residentOptions = useMemo(() => residents.filter((resident) => resident.status !== 'vacant'), [residents]);
  const [residentId, setResidentId] = useState<string>(residentOptions[0]?.id ?? '');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [description, setDescription] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!residentId || !description.trim()) {
      toast.error('Resident and complaint description are required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/colony/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resident_id: residentId,
            description,
            priority,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? response.statusText);
        toast.success('Complaint raised');
        setDescription('');
        setPriority('medium');
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Complaint create failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={residentOptions.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Raise Ticket
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Raise Complaint
            </DialogTitle>
            <DialogDescription>
              Secretary-side ticket entry. WhatsApp remains the primary resident intake channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>Resident</Label>
            <Select value={residentId} onValueChange={setResidentId} disabled={residentOptions.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
              <SelectContent>
                {residentOptions.map((resident) => (
                  <SelectItem key={resident.id} value={resident.id}>
                    {resident.name} · {resident.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value: ComplaintPriority) => setPriority(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complaint-description">Description</Label>
            <Textarea
              id="complaint-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue. Category and assignment will be auto-derived where possible."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || residentOptions.length === 0}>{pending ? 'Creating…' : 'Create Ticket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
