'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function BillingTrigger({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => {
      try {
        const res = await fetch('/api/colony/billing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        toast.success(`Billing: ${j.sent ?? 0} invoices sent · ${j.failed ?? 0} failed`); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    })}>
      <Receipt className="h-4 w-4 mr-2" /> {pending ? 'Generating…' : 'Generate Bills Now'}
    </Button>
  );
}
