'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BellRing, CalendarDays, CheckCircle2, Clock3, MessageCircle, RefreshCw, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiThread } from '@/lib/whatsai-data';

export function DashboardHome({ data }: { data: WhatsAiInboxData }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayMessages = data.summary.metrics.inboundToday + data.summary.metrics.outboundToday;
  const qualifiedToday = data.threads.filter((thread) => thread.qualification.qualified && thread.lastMessageAt.startsWith(today)).length;
  const appointments = data.threads.flatMap((thread) => thread.appointment ? [{ thread, appointment: thread.appointment }] : []);
  const appointmentsThisWeek = appointments.filter(({ appointment }) => isThisWeek(appointment.scheduledAt)).length;
  const upcoming = appointments
    .filter(({ appointment }) => new Date(appointment.scheduledAt).getTime() >= Date.now() && appointment.status !== 'cancelled')
    .sort((left, right) => left.appointment.scheduledAt.localeCompare(right.appointment.scheduledAt))
    .slice(0, 3);
  const activity = [...data.threads].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt)).slice(0, 5);

  return <div className="space-y-6">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#00a884]">{formatDate(new Date())}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111b21] sm:text-3xl">Good morning! Here&apos;s your WhatsAI summary.</h1><p className="mt-2 text-sm text-[#667781]">A quick briefing on conversations that need your attention today.</p></div><Button asChild className="w-full sm:w-auto"><Link href="/chats">View all chats <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="WhatsApp messages today" value={todayMessages} icon={MessageCircle} accent="green" />
      <Kpi label="Leads qualified today" value={qualifiedToday} icon={CheckCircle2} accent="blue" />
      <Kpi label="Appointments this week" value={appointmentsThisWeek} icon={CalendarDays} accent="green" />
      <Kpi label="Hot handoffs pending" value={data.summary.metrics.humanHandoffs} icon={BellRing} accent="orange" />
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]"><Card className="border-[#d8dee4] shadow-sm"><CardHeader className="flex flex-row items-center justify-between border-b border-[#edf0f2] p-4"><div><CardTitle className="text-base">Today&apos;s activity</CardTitle><p className="mt-1 text-xs text-muted-foreground">The five conversations most recently touched by the assistant.</p></div><MessageCircle className="h-5 w-5 text-[#00a884]" /></CardHeader><CardContent className="p-2 sm:p-3">{activity.length ? activity.map((thread) => <ActivityRow key={thread.id} thread={thread} />) : <EmptyState title="No activity yet" body="New WhatsApp conversations will appear here." />}</CardContent></Card><Card className="border-[#d8dee4] shadow-sm"><CardHeader className="border-b border-[#edf0f2] p-4"><CardTitle className="text-base">Upcoming appointments</CardTitle><p className="mt-1 text-xs text-muted-foreground">The next three bookings from WhatsApp.</p></CardHeader><CardContent className="space-y-3 p-4">{upcoming.length ? upcoming.map(({ thread, appointment }) => <AppointmentRow key={appointment.id} thread={thread} appointment={appointment} />) : <EmptyState title="No appointments booked" body="Qualified leads with appointment intent will appear here." />}</CardContent></Card></section>

    <AgentStatus />
  </div>;
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent: 'green' | 'blue' | 'orange' }) { return <Card className="border-[#d8dee4] shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', accent === 'green' && 'bg-[#e7fce3] text-[#075e54]', accent === 'blue' && 'bg-[#e5f3ff] text-[#1677b8]', accent === 'orange' && 'bg-[#fff1df] text-[#b45309]')}><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="text-2xl font-bold text-[#111b21]">{value}</div><div className="mt-0.5 text-xs leading-tight text-[#667781]">{label}</div></div></CardContent></Card>; }

function ActivityRow({ thread }: { thread: WhatsAiThread }) { const status = activityStatus(thread); return <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-[#f0f2f5]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-bold text-[#075e54]">{initials(thread.contactName)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="truncate text-sm font-semibold text-[#111b21]">{thread.contactName}</div><span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</span></div><div className="mt-1 truncate text-xs text-[#667781]">{thread.lastBody}</div></div><Badge variant={status === 'Handoff' ? 'warning' : status === 'Appointment' ? 'success' : 'outline'} className="hidden shrink-0 sm:inline-flex">{status}</Badge></Link>; }

function AppointmentRow({ thread, appointment }: { thread: WhatsAiThread; appointment: NonNullable<WhatsAiThread['appointment']> }) { return <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className="block rounded-xl border border-[#d8dee4] p-3 transition hover:border-[#00a884] hover:bg-[#f8fffa]"><div className="flex items-start justify-between gap-2"><div className="font-semibold text-sm">{thread.contactName}</div><Badge variant="success">{appointment.status}</Badge></div><div className="mt-2 flex items-center gap-2 text-xs text-[#667781]"><Clock3 className="h-3.5 w-3.5 text-[#00a884]" />{formatDateTime(appointment.scheduledAt)}</div><div className="mt-1 text-xs capitalize text-[#667781]">{appointment.type.replace('_', ' ')}</div></Link>; }

function AgentStatus() { const [agents, setAgents] = useState<Record<string, boolean>>({}); const [loading, setLoading] = useState(true); useEffect(() => { let active = true; fetch('/api/agent-mesh/health', { cache: 'no-store' }).then((response) => response.json()).then((payload) => { if (!active) return; setAgents(normalizeAgentHealth(payload)); setLoading(false); }).catch(() => { if (active) { setAgents({}); setLoading(false); } }); return () => { active = false; }; }, []); const names = ['Summoner', 'Sales Agent', 'Tool Gateway']; return <Card className="border-[#d8dee4] shadow-sm"><CardHeader className="flex flex-row items-center justify-between border-b border-[#edf0f2] p-4"><div><CardTitle className="text-base">Agent status</CardTitle><p className="mt-1 text-xs text-muted-foreground">Your WhatsApp workflow services.</p></div>{loading ? <RefreshCw className="h-4 w-4 animate-spin text-[#667781]" /> : <Sparkles className="h-5 w-5 text-[#00a884]" />}</CardHeader><CardContent className="grid gap-2 p-4 sm:grid-cols-3">{names.map((name) => { const key = name === 'Sales Agent' ? 'sales' : name === 'Tool Gateway' ? 'tool-gateway' : 'summoner'; const online = agents[key] ?? false; return <div key={name} className="flex items-center gap-3 rounded-xl border border-[#d8dee4] bg-[#f8fafb] p-3"><span className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-[#00a884]' : 'bg-slate-300')} /><div><div className="text-sm font-semibold">{name}</div><div className="text-[11px] text-[#667781]">{loading ? 'Checking…' : online ? 'Online' : 'Offline'}</div></div></div>; })}</CardContent></Card>; }

function normalizeAgentHealth(payload: unknown): Record<string, boolean> { const value = payload as { ok?: boolean; checks?: Record<string, unknown> } | null; const checks = value?.checks ?? {}; const normalized = Object.fromEntries(Object.entries(checks).map(([key, entry]) => { const result = entry as { ok?: boolean; status?: string } | null; return [key.toLowerCase().replace(/_/g, '-'), Boolean(result?.ok || result?.status === 'ok' || result?.status === 'online')]; })); if (value?.ok) normalized.summoner = true; return normalized; }

function EmptyState({ title, body }: { title: string; body: string }) { return <div className="rounded-xl border border-dashed border-[#d8dee4] p-5 text-center"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{body}</p></div>; }
function activityStatus(thread: WhatsAiThread) { if (thread.hotHandoff || thread.status === 'pending_human') return 'Handoff'; if (thread.appointment) return 'Appointment'; if (thread.qualification.answered > 0 && !thread.qualification.qualified) return 'Qualifying'; return 'Replied'; }
function isThisWeek(value: string) { const now = new Date(); const date = new Date(value); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function initials(name: string) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WA'; }
function formatDate(value: Date) { return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(value); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
