import {
  Activity,
  CalendarCheck,
  CheckCircle,
  Handshake,
  MessageSquare,
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
      <PageHeader
        title="WhatsAI Command Center"
        titleHi="WhatsApp AI कमांड सेंटर"
        description="Aaj ke WhatsApp messages, qualification, appointments, aur hot handoffs ek jagah."
      />

      <section className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="WhatsApp Messages Today" labelHi="आज के मैसेज" value={24} icon={MessageSquare} accent="primary" />
        <KPICard label="Qualified Leads" labelHi="क्वालिफाइड लीड्स" value={8} icon={CheckCircle} accent="success" />
        <KPICard label="Hot Handoffs" labelHi="हॉट हैंडऑफ" value={2} icon={Handshake} accent="warning" />
        <KPICard label="Appointments Booked" labelHi="बुक्ड अपॉइंटमेंट्स" value={3} icon={CalendarCheck} accent="success" />
        <KPICard label="Trial Status" labelHi="ट्रायल स्टेटस" value="Day 3 of 7" icon={Zap} accent="primary" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Today&apos;s AI Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_ACTIVITY.map((item) => (
              <ActivityItem key={`${item.time}-${item.name}`} {...item} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Agent Status
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

function ActivityItem({ time, name, action, status }: {
  time: string;
  name: string;
  action: string;
  status: ActivityStatus;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">[{time}]</span>
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
