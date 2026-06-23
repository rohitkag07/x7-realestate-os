'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function HuntButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(async () => {
      try {
        const res = await fetch('/api/ghost-closer/hunt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        toast.success(`Hunt: ${j.sent ?? 0} sent · ${j.skipped ?? 0} skipped · ${j.failed ?? 0} failed`); router.refresh();
      } catch (e) { toast.error((e as Error).message); }
    })}>
      <Zap className="h-4 w-4 mr-2" /> {pending ? 'Hunting…' : 'Run Nightly Hunt Now'}
    </Button>
  );
}
