'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Siren,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiThread } from '@/lib/whatsai-data';

export function DashboardHome({ data }: { data: WhatsAiInboxData }) {
  const today = new Date().toISOString().slice(0, 10);
  const metrics = data.summary.metrics;
  const todayMessages = metrics.inboundToday + metrics.outboundToday;
  const qualifiedToday = data.threads.filter((thread) => thread.qualification.qualified && thread.lastMessageAt.startsWith(today)).length;
  const appointments = data.threads.flatMap((thread) => thread.appointment ? [{ thread, appointment: thread.appointment }] : []);
  const appointmentsThisWeek = appointments.filter(({ appointment }) => isThisWeek(appointment.scheduledAt)).length;
  const upcoming = appointments
    .filter(({ appointment }) => new Date(appointment.scheduledAt).getTime() >= Date.now() && appointment.status !== 'cancelled')
    .sort((left, right) => left.appointment.scheduledAt.localeCompare(right.appointment.scheduledAt))
    .slice(0, 3);
  const activity = [...data.threads].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt)).slice(0, 5);
  const attention = data.threads
    .filter((thread) => thread.hotHandoff || thread.status === 'pending_human' || thread.aiMode === 'manual' || thread.aiMode === 'paused')
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="grid gap-5 border-b border-[#d8dee4] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="wa-kicker">{formatDate(new Date())}</p>
          <h1 className="wa-page-title mt-2">Good morning. Your customer desk is ready.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">Start with the conversations that need you, then review bookings and recent customer activity.</p>
        </div>
        <Button asChild size="lg" className="w-full bg-[#075e54] hover:bg-[#064e46] lg:w-auto">
          <Link href="/chats">Open customer inbox <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </header>

      <section aria-label="Today at a glance" className="wa-panel grid grid-cols-2 divide-x divide-y divide-[#e7ebe9] overflow-hidden lg:grid-cols-4 lg:divide-y-0">
        <Metric label="Messages today" value={todayMessages} icon={MessageCircle} />
        <Metric label="Qualified today" value={qualifiedToday} icon={CheckCircle2} />
        <Metric label="Appointments this week" value={appointmentsThisWeek} icon={CalendarDays} />
        <Metric label="Needs your attention" value={metrics.humanHandoffs} icon={Siren} attention={metrics.humanHandoffs > 0} />
      </section>

      <section className="grid grid-flow-dense grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="wa-panel overflow-hidden xl:col-span-8">
          <SectionHeader title="Needs attention" description="Customer conversations waiting for a human decision." icon={Siren} action={{ href: '/chats', label: 'Review inbox' }} />
          <div className="divide-y divide-[#edf0ef] px-2 pb-2">
            {attention.length ? attention.map((thread) => <AttentionRow key={thread.id} thread={thread} />) : (
              <PositiveState title="No handoffs waiting" body="WhatsAI is handling active conversations. You will see urgent customer requests here." />
            )}
          </div>
        </div>

        <div className="wa-panel overflow-hidden xl:col-span-4">
          <SectionHeader title="Next appointments" description="Upcoming customer commitments." icon={CalendarDays} action={{ href: '/calendar', label: 'Calendar' }} />
          <div className="space-y-2 p-3">
            {upcoming.length ? upcoming.map(({ thread, appointment }) => <AppointmentRow key={appointment.id} thread={thread} appointment={appointment} />) : (
              <PositiveState compact title="No appointments yet" body="Bookings made from WhatsApp will appear here." />
            )}
          </div>
        </div>

        <div className="wa-panel overflow-hidden xl:col-span-8">
          <SectionHeader title="Recent customer activity" description="The latest conversations across your business." icon={MessageCircle} action={{ href: '/chats', label: 'All chats' }} />
          <div className="divide-y divide-[#edf0ef] px-2 pb-2">
            {activity.length ? activity.map((thread) => <ActivityRow key={thread.id} thread={thread} />) : (
              <PositiveState title="No customer activity yet" body="A new WhatsApp message will appear here as soon as it arrives." />
            )}
          </div>
        </div>

        <div className="wa-panel overflow-hidden xl:col-span-4">
          <AgentStatus />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, attention = false }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; attention?: boolean }) {
  return (
    <div className={cn('flex min-h-28 items-center gap-3 p-4 sm:p-5', attention && 'bg-[#fff8ee]')}>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', attention ? 'bg-[#ffead0] text-[#b45309]' : 'bg-[#edf8f4] text-[#075e54]')}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0"><div className="text-2xl font-semibold tracking-[-0.04em] text-[#111b21]">{value}</div><div className="mt-1 text-xs leading-4 text-[#667781]">{label}</div></div>
    </div>
  );
}

function SectionHeader({ title, description, icon: Icon, action }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e7ebe9] px-4 py-4 sm:px-5">
      <div className="flex min-w-0 gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf8f4] text-[#075e54]"><Icon className="h-4 w-4" /></div><div><h2 className="font-semibold tracking-[-0.02em] text-[#111b21]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#667781]">{description}</p></div></div>
      {action ? <Link href={action.href} className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-[#087d70] hover:text-[#075e54] sm:flex">{action.label}<ChevronRight className="h-3.5 w-3.5" /></Link> : null}
    </div>
  );
}

function AttentionRow({ thread }: { thread: WhatsAiThread }) {
  return (
    <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className="wa-row group flex items-center gap-3 rounded-xl px-3 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0dc] text-xs font-semibold text-[#a84f0f]">{initials(thread.contactName)}</div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-[#111b21]">{thread.contactName}</span><span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" /></div><p className="mt-1 truncate text-xs text-[#667781]">{thread.hotHandoff?.reason || thread.lastBody}</p></div>
      <div className="text-right"><Badge variant="warning">Needs you</Badge><div className="mt-1 text-[10px] text-[#8696a0]">{formatTime(thread.lastMessageAt)}</div></div>
    </Link>
  );
}

function ActivityRow({ thread }: { thread: WhatsAiThread }) {
  const status = activityStatus(thread);
  return (
    <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className="wa-row group flex items-center gap-3 rounded-xl px-3 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-semibold text-[#075e54]">{initials(thread.contactName)}</div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[#111b21]">{thread.contactName}</div><div className="mt-1 truncate text-xs text-[#667781]">{thread.lastBody}</div></div>
      <div className="text-right"><Badge variant={status === 'Needs you' ? 'warning' : status === 'Booked' ? 'success' : 'outline'}>{status}</Badge><div className="mt-1 text-[10px] text-[#8696a0]">{formatTime(thread.lastMessageAt)}</div></div>
    </Link>
  );
}

function AppointmentRow({ thread, appointment }: { thread: WhatsAiThread; appointment: NonNullable<WhatsAiThread['appointment']> }) {
  return (
    <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className="wa-row block rounded-xl border border-transparent bg-[#f7faf8] p-3 hover:border-[#b7ddd2]">
      <div className="flex items-start justify-between gap-2"><div className="text-sm font-semibold text-[#111b21]">{thread.contactName}</div><Badge variant="success">{appointment.status}</Badge></div>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#667781]"><Clock3 className="h-3.5 w-3.5 text-[#00a884]" />{formatDateTime(appointment.scheduledAt)}</div>
      <div className="mt-1 text-xs capitalize text-[#667781]">{appointment.type.replace('_', ' ')}</div>
    </Link>
  );
}

function AgentStatus() {
  const [agents, setAgents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/agent-mesh/health', { cache: 'no-store' }).then((response) => response.json()).then((payload) => {
      if (!active) return;
      setAgents(normalizeAgentHealth(payload));
      setLoading(false);
    }).catch(() => { if (active) { setAgents({}); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const names = ['Summoner', 'Sales Agent', 'Tool Gateway'];
  const onlineCount = names.filter((name) => agents[name === 'Sales Agent' ? 'sales' : name === 'Tool Gateway' ? 'tool-gateway' : 'summoner']).length;
  return (
    <>
      <SectionHeader title="Reception services" description={loading ? 'Checking service status.' : `${onlineCount} of ${names.length} services online.`} icon={ShieldCheck} />
      <div className="divide-y divide-[#edf0ef] px-4 py-2">
        {names.map((name) => {
          const key = name === 'Sales Agent' ? 'sales' : name === 'Tool Gateway' ? 'tool-gateway' : 'summoner';
          const online = agents[key] ?? false;
          return <div key={name} className="flex items-center justify-between py-3"><div className="text-sm font-medium text-[#111b21]">{name}</div><div className="flex items-center gap-2 text-xs text-[#667781]"><span className={cn('h-2 w-2 rounded-full', online ? 'bg-[#00a884]' : 'bg-slate-300')} />{loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : online ? 'Online' : 'Offline'}</div></div>;
        })}
      </div>
    </>
  );
}

function PositiveState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return <div className={cn('m-2 flex flex-col items-center justify-center rounded-xl bg-[#f7faf8] px-5 text-center', compact ? 'min-h-36' : 'min-h-44')}><CheckCircle2 className="h-7 w-7 text-[#00a884]" /><p className="mt-3 text-sm font-semibold text-[#111b21]">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#667781]">{body}</p></div>;
}

function normalizeAgentHealth(payload: unknown): Record<string, boolean> { const value = payload as { ok?: boolean; checks?: Record<string, unknown> } | null; const checks = value?.checks ?? {}; const normalized = Object.fromEntries(Object.entries(checks).map(([key, entry]) => { const result = entry as { ok?: boolean; status?: string } | null; return [key.toLowerCase().replace(/_/g, '-'), Boolean(result?.ok || result?.status === 'ok' || result?.status === 'online')]; })); if (value?.ok) normalized.summoner = true; return normalized; }
function activityStatus(thread: WhatsAiThread) { if (thread.hotHandoff || thread.status === 'pending_human') return 'Needs you'; if (thread.appointment) return 'Booked'; if (thread.qualification.answered > 0 && !thread.qualification.qualified) return 'Qualifying'; return 'AI handling'; }
function isThisWeek(value: string) { const now = new Date(); const date = new Date(value); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function initials(name: string) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WA'; }
function formatDate(value: Date) { return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(value); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
