import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  Clock3,
  Handshake,
  MessageSquare,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ActivityStatus = 'replied' | 'handoff' | 'qualifying' | 'appointment';

const DEMO_ACTIVITY: {
  time: string;
  name: string;
  action: string;
  status: ActivityStatus;
}[] = [
  { time: '10:32 AM', name: 'Aditya Sharma', action: 'Asked about 2BHK — AI replied in 4s', status: 'replied' },
  { time: '10:45 AM', name: 'Dr. Meena Joshi', action: 'Appointment booked for Saturday', status: 'handoff' },
  { time: '11:02 AM', name: 'Rohit Verma', action: 'Coaching fee enquiry — Step 3/5', status: 'qualifying' },
  { time: '11:18 AM', name: 'Neha Soni', action: 'Clinic consultation slot confirmed', status: 'appointment' },
];

const statusVariant: Record<ActivityStatus, 'default' | 'success' | 'warning' | 'outline'> = {
  replied: 'success',
  handoff: 'warning',
  qualifying: 'outline',
  appointment: 'default',
};

export function DashboardHomePage() {
  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(37,211,102,0.16),rgba(40,231,197,0.08)_42%,rgba(255,255,255,0.04))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:items-end">
          <PageHeader
            title="WhatsAI Command Center"
            titleHi="WhatsApp AI कमांड सेंटर"
            description="A live operating console for messages, qualification, appointments, and owner handoffs across your WhatsApp trial."
          />
          <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Receptionist online</div>
                <div className="text-xs text-muted-foreground">Median reply time · 4s</div>
              </div>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/12 text-emerald-200">
                <span className="absolute h-5 w-5 rounded-full bg-emerald-300/30 animate-ping" />
                <Radio className="h-5 w-5" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="SLA" value="99%" />
              <MiniStat label="Hot" value="2" />
              <MiniStat label="Trial" value="D3" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="WhatsApp Messages Today" labelHi="आज के मैसेज" value={24} icon={MessageSquare} accent="primary" />
        <KPICard label="Qualified Leads" labelHi="क्वालिफाइड लीड्स" value={8} icon={CheckCircle} accent="success" />
        <KPICard label="Hot Handoffs" labelHi="हॉट हैंडऑफ" value={2} icon={Handshake} accent="warning" />
        <KPICard label="Appointments Booked" labelHi="बुक्ड अपॉइंटमेंट्स" value={3} icon={CalendarCheck} accent="success" />
        <KPICard label="Trial Status" labelHi="ट्रायल स्टेटस" value="Day 3 of 7" icon={Zap} accent="primary" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-transparent" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Today&apos;s AI Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="signal-rail space-y-3">
            {DEMO_ACTIVITY.map((item) => (
              <ActivityItem key={`${item.time}-${item.name}`} {...item} />
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-300/80 via-emerald-300/60 to-transparent" />
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Agent Status
              </span>
              <Badge variant="success">All clear</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AgentRow name="WhatsApp Receptionist" status="active" detail="Replying to new customer messages" />
            <AgentRow name="Qualification Engine" status="active" detail="Asking the next best question" />
            <AgentRow name="Handoff Monitor" status="active" detail="Watching for owner-ready leads" />
            <AgentRow name="Follow-up Queue" status="idle" detail="No pending follow-ups right now" />
            <AgentRow name="Trial Usage Watch" status="idle" detail="Day 3 usage is within limit" />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function ActivityItem({ time, name, action, status }: {
  time: string;
  name: string;
  action: string;
  status: ActivityStatus;
}) {
  return (
    <div className="relative ml-1 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3 pl-10 transition duration-200 hover:border-emerald-300/25 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
      <span className="absolute left-2.5 top-4 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/25 bg-[#091421] text-emerald-200 shadow-[0_0_22px_rgba(37,211,102,0.24)]">
        {status === 'handoff' ? <Handshake className="h-3 w-3" /> : status === 'appointment' ? <CalendarCheck className="h-3 w-3" /> : status === 'qualifying' ? <Clock3 className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">[{time}]</span>
          <span className="text-sm font-semibold">{name}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{action}</p>
      </div>
      <Badge variant={statusVariant[status]} className="w-fit capitalize">{status}</Badge>
    </div>
  );
}

function AgentRow({ name, status, detail }: { name: string; status: 'active' | 'idle'; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 transition duration-200 hover:bg-white/[0.06]">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${status === 'active' ? 'bg-emerald-300 shadow-[0_0_18px_rgba(37,211,102,0.75)] animate-pulse' : 'bg-slate-500'}`} />
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
