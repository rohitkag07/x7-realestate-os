'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Pencil, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Resident } from '@/types/database';

interface ResidentFormDialogProps {
  projectId: string;
  resident?: Resident;
  triggerMode?: 'add' | 'edit';
}

type ResidentFormState = {
  name: string;
  phone: string;
  email: string;
  alt_phone: string;
  status: Resident['status'];
  move_in_date: string;
  move_out_date: string;
  emergency_name: string;
  emergency_phone: string;
};

const emptyState = (): ResidentFormState => ({
  name: '',
  phone: '',
  email: '',
  alt_phone: '',
  status: 'owner',
  move_in_date: new Date().toISOString().slice(0, 10),
  move_out_date: '',
  emergency_name: '',
  emergency_phone: '',
});

function initialFromResident(resident?: Resident): ResidentFormState {
  if (!resident) return emptyState();
  return {
    name: resident.name ?? '',
    phone: resident.phone ?? '',
    email: resident.email ?? '',
    alt_phone: resident.alt_phone ?? '',
    status: resident.status,
    move_in_date: resident.move_in_date ?? '',
    move_out_date: resident.move_out_date ?? '',
    emergency_name: String(resident.emergency_contact?.name ?? ''),
    emergency_phone: String(resident.emergency_contact?.phone ?? ''),
  };
}

export function ResidentFormDialog({ projectId, resident, triggerMode = resident ? 'edit' : 'add' }: ResidentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ResidentFormState>(() => initialFromResident(resident));

  useEffect(() => {
    setForm(initialFromResident(resident));
  }, [resident]);

  function update<K extends keyof ResidentFormState>(key: K, value: ResidentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          project_id: resident?.project_id ?? projectId,
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          alt_phone: form.alt_phone || null,
          status: form.status,
          move_in_date: form.move_in_date || null,
          move_out_date: form.move_out_date || null,
          emergency_contact: {
            ...(form.emergency_name ? { name: form.emergency_name } : {}),
            ...(form.emergency_phone ? { phone: form.emergency_phone } : {}),
          },
        };

        const response = await fetch(
          resident ? `/api/colony/residents/${resident.id}` : '/api/colony/residents',
          {
            method: resident ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? response.statusText);

        toast.success(resident ? 'Resident updated' : 'Resident added');
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Resident save failed');
      }
    });
  }

  const isEdit = triggerMode === 'edit';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" aria-label="Edit resident">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Resident
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {resident ? 'Edit Resident' : 'Add Resident'}
            </DialogTitle>
            <DialogDescription>
              Maintain resident profile, occupancy status, and emergency contact for the colony desk.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resident-name">Name</Label>
              <Input id="resident-name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-phone">Phone</Label>
              <Input id="resident-phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-email">Email</Label>
              <Input id="resident-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-alt-phone">Alt Phone</Label>
              <Input id="resident-alt-phone" value={form.alt_phone} onChange={(e) => update('alt_phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: Resident['status']) => update('status', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="co_owner">Co-owner</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-move-in">Move-in Date</Label>
              <Input id="resident-move-in" type="date" value={form.move_in_date} onChange={(e) => update('move_in_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-move-out">Move-out Date</Label>
              <Input id="resident-move-out" type="date" value={form.move_out_date} onChange={(e) => update('move_out_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-emergency-name">Emergency Contact</Label>
              <Input id="resident-emergency-name" value={form.emergency_name} onChange={(e) => update('emergency_name', e.target.value)} placeholder="Name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resident-emergency-phone">Emergency Phone</Label>
              <Input id="resident-emergency-phone" value={form.emergency_phone} onChange={(e) => update('emergency_phone', e.target.value)} placeholder="+91..." />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : (resident ? 'Update Resident' : 'Create Resident')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
