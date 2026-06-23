'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ComplaintStatus } from '@/types/database';
export function ComplaintActions({ id, current }: { id: string; current: ComplaintStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: { label: string; status: ComplaintStatus }[] =
    current === 'open' ? [{ label: 'Start', status: 'in_progress' }]
    : current === 'in_progress' ? [{ label: 'Resolved', status: 'resolved' }]
    : current === 'resolved' ? [{ label: 'Close', status: 'closed' }, { label: 'Reopen', status: 'reopened' }]
    : current === 'reopened' ? [{ label: 'In Progress', status: 'in_progress' }]
    : [];
  function go(status: ComplaintStatus) {
    start(async () => {
      try {
        const res = await fetch(`/api/colony/complaints/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, by_name: 'Secretary' }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        toast.success(`Ticket → ${status}`); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    });
  }
  if (!next.length) return null;
  return <div className="flex gap-1 mt-2">{next.map((b) => <Button key={b.status} size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={pending} onClick={() => go(b.status)}>{b.label}</Button>)}</div>;
}
