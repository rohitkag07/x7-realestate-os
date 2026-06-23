'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
export function VisitorActions({ visitorId }: { visitorId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function act(approved: boolean) {
    start(async () => {
      try {
        const res = await fetch(`/api/colony/visitors/${visitorId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved, by_name: 'Secretary' }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        toast.success(approved ? 'Visitor approved' : 'Visitor denied'); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    });
  }
  return (
    <div className="flex gap-1 justify-end">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act(true)}>Approve</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(false)} className="text-red-600">Deny</Button>
    </div>
  );
}
