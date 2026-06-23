'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Play, Pause } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatINR } from '@/lib/utils';
import type { AdCampaign } from '@/types/database';

export function CampaignCard({ campaign }: { campaign: AdCampaign }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(campaign.status);
  function toggle() {
    const next = status === 'active' ? 'PAUSED' : 'ACTIVE';
    start(async () => {
      const prev = status; setStatus(next.toLowerCase() as AdCampaign['status']);
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? res.statusText);
        toast.success(next === 'PAUSED' ? 'Campaign paused' : 'Campaign resumed'); router.refresh();
      } catch (e) { setStatus(prev); toast.error((e as Error).message); }
    });
  }
  const util = Math.min(100, Math.round((campaign.budget_spent / Math.max(campaign.budget_daily ?? 1, 1) / 30) * 100));
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="uppercase">{campaign.platform}</Badge>
              <Badge variant="outline" className="capitalize">{campaign.campaign_type.replace(/_/g, ' ')}</Badge>
              <Badge variant={status === 'active' ? 'success' : 'secondary'} className="capitalize">{status}</Badge>
            </div>
            <h3 className="font-semibold mt-2">{campaign.campaign_name}</h3>
          </div>
          <Button size="sm" variant="outline" disabled={pending} onClick={toggle}>
            {status === 'active' ? <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</> : <><Play className="h-3.5 w-3.5 mr-1.5" /> Resume</>}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
          <Stat label="Daily Budget" value={formatINR(campaign.budget_daily ?? 0)} />
          <Stat label="Spent" value={formatINR(campaign.budget_spent)} />
          <Stat label="Leads" value={String(campaign.leads_generated)} />
          <Stat label="CPL" value={campaign.cpl ? formatINR(campaign.cpl) : '—'} />
          <Stat label="CTR" value={campaign.ctr ? `${campaign.ctr}%` : '—'} />
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Budget utilization (month)</span><span>{util}%</span></div>
          <Progress value={util} />
        </div>
      </CardContent>
    </Card>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="font-semibold tabular-nums">{value}</div></div>;
}
