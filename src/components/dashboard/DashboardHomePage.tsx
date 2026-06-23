'use client';

import { Users, Calendar, IndianRupee, ImageIcon, Activity, ArrowUpRight, CircleDot } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DashboardHomePage() {
  return (
    <>
      <PageHeader
        title="Today's Snapshot"
        titleHi="आज का स्नैपशॉट"
        description="Marketing engine, sales pipeline, and colony health — at a glance."
      />

      <section className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="Leads Today" labelHi="आज के लीड्स" value={12} delta={20} icon={Users} accent="primary" />
        <KPICard label="Site Visits" labelHi="साइट विज़िट्स" value={3} delta={50} icon={Calendar} accent="success" />
        <KPICard label="Bookings" labelHi="बुकिंग्स" value={1} delta={0} icon={IndianRupee} accent="warning" />
        <KPICard label="Revenue (Month)" labelHi="इस महीने रेवेन्यू" value="₹18L" delta={12} icon={IndianRupee} accent="success" />
        <KPICard label="Content Posted" labelHi="आज पोस्ट हुआ" value={2} delta={-25} icon={ImageIcon} accent="primary" />
      </section>

      <section className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <MetricPanel
          title="Lead Momentum"
          description="This week's lead intake is strongest from Meta and referral loops."
          items={[
            { label: 'Meta Ads', value: '18 leads', detail: '+22% vs last week' },
            { label: 'WhatsApp', value: '11 leads', detail: 'Fastest response time' },
            { label: 'Referrals', value: '6 leads', detail: 'Highest booking intent' },
          ]}
        />
        <MetricPanel
          title="Revenue Pulse"
          description="Collections are healthy and site visits are converting on schedule."
          items={[
            { label: 'Token Revenue', value: '₹3.2L', detail: '1 booking confirmed today' },
            { label: 'Visit Conversion', value: '33%', detail: '3 visits, 1 booking' },
            { label: 'Pending Closures', value: '₹14.8L', detail: '6 warm leads in follow-up' },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Source Quality Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <SourceCard source="Meta Ads" quality="High" insight="Most scalable top-of-funnel channel right now." />
            <SourceCard source="Google" quality="Medium" insight="Intent is strong but volume is still modest." />
            <SourceCard source="Referral" quality="High" insight="Small volume, strongest close probability." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Agent Activity (Live)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AgentRow name="Sales Agent" status="active" detail="Replied to 7 WhatsApp leads · last 1 hr" />
            <AgentRow name="Content Agent" status="active" detail="Rendered 2 reels via Remotion · last 24 hr" />
            <AgentRow name="Ads Agent" status="active" detail="Reallocated ₹1,200 to best-performing creative" />
            <AgentRow name="Colony Agent" status="idle" detail="No new complaints today" />
            <AgentRow name="Finance Agent" status="idle" detail="June invoices scheduled for 1st" />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function MetricPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { label: string; value: string; detail: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SourceCard({
  source,
  quality,
  insight,
}: {
  source: string;
  quality: 'High' | 'Medium' | 'Low';
  insight: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{source}</span>
        <Badge variant="outline">{quality}</Badge>
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{insight}</span>
      </div>
    </div>
  );
}

function AgentRow({ name, status, detail }: { name: string; status: 'active' | 'idle'; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <Badge variant="outline" className="capitalize text-[10px]">
            {status}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{detail}</div>
      </div>
    </div>
  );
}
