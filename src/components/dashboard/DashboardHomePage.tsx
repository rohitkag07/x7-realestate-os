'use client';

import { Users, Calendar, MessageCircle, BellRing, Activity, ArrowUpRight, CircleDot } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DashboardHomePage() {
  return (
    <>
      <PageHeader
        title="WhatsAI Trial Console"
        titleHi="WhatsApp AI डैशबोर्ड"
        description="WhatsApp conversations, lead qualification, hot handoffs, and follow-ups in one live view."
      />

      <section className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="WhatsApp Leads" labelHi="WhatsApp लीड्स" value={12} delta={20} icon={MessageCircle} accent="primary" />
        <KPICard label="Qualified" labelHi="क्वालिफाइड" value={7} delta={18} icon={Users} accent="success" />
        <KPICard label="Appointments" labelHi="अपॉइंटमेंट्स" value={3} delta={50} icon={Calendar} accent="success" />
        <KPICard label="Hot Handoffs" labelHi="हॉट हैंडऑफ" value={2} delta={0} icon={BellRing} accent="warning" />
        <KPICard label="Replies Sent" labelHi="भेजे गए जवाब" value={42} delta={31} icon={Activity} accent="primary" />
      </section>

      <section className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <MetricPanel
          title="Lead Momentum"
          description="This week's WhatsApp intake is strongest from Meta ads and direct referrals."
          items={[
            { label: 'Meta Ads', value: '18 leads', detail: '+22% vs last week' },
            { label: 'WhatsApp Organic', value: '11 leads', detail: 'Fastest response time' },
            { label: 'Referrals', value: '6 leads', detail: 'Highest appointment intent' },
          ]}
        />
        <MetricPanel
          title="Assistant Pulse"
          description="Qualification, appointment booking, and owner alerts are moving without manual follow-up."
          items={[
            { label: 'Avg First Reply', value: '3 sec', detail: 'Always-on WhatsApp response' },
            { label: 'Qualification Rate', value: '58%', detail: '7 qualified from 12 new chats' },
            { label: 'Pending Follow-ups', value: '6', detail: 'Warm leads waiting for next nudge' },
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
            <SourceCard source="Meta Ads" quality="High" insight="Most scalable top-of-funnel channel for WhatsApp trials." />
            <SourceCard source="Google" quality="Medium" insight="Intent is strong but WhatsApp volume is still modest." />
            <SourceCard source="Referral" quality="High" insight="Small volume, strongest handoff probability." />
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
            <AgentRow name="WhatsAI Receptionist" status="active" detail="Replied to 7 WhatsApp leads · last 1 hr" />
            <AgentRow name="Qualification Playbook" status="active" detail="Captured budget, need, and appointment intent" />
            <AgentRow name="Owner Handoff" status="active" detail="Sent 2 hot-lead alerts to the business owner" />
            <AgentRow name="Follow-up Engine" status="idle" detail="Next warm lead nudge scheduled" />
            <AgentRow name="Setup Monitor" status="idle" detail="Meta webhook and Supabase checks ready" />
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
