'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Bot, CalendarDays, CheckCheck, ChevronLeft, Clock3, Flame, Inbox,
  MessageCircle, PanelRight, PauseCircle, RefreshCw, RotateCcw, Send, ShieldAlert,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiMessage, WhatsAiThread } from '@/lib/whatsai-data';
import type { AiMode } from '@/types/database';

type Props = { data: WhatsAiInboxData };
const ownerOptions = ['Owner Desk', 'Arjun Sales', 'Ritika Closer', 'Ghost Closer Desk'];

export function WhatsAiInbox({ data }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [owner, setOwner] = useState(data.selectedThread?.assignedTo ?? 'Owner Desk');
  const [note, setNote] = useState(data.selectedThread?.internalNote ?? '');
  const [leadOpen, setLeadOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const selected = data.selectedThread;
  const isPaused = selected?.aiMode === 'manual' || selected?.aiMode === 'paused';
  const refresh = () => router.refresh();

  function sendReply() {
    if (!selected || !draft.trim()) return;
    startTransition(async () => {
      try {
        const response = await fetch('/api/whatsai/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ builder_id: selected.builderId, business_id: selected.businessId, lead_id: selected.leadId, phone: selected.phone, body: draft.trim(), agent: 'whatsai-operator' }),
        });
        const payload = await response.json().catch(() => null);
        if (!payload?.sent) throw new Error(payload?.error || 'Reply failed');
        setDraft('');
        payload.ok ? toast.success('Manual WhatsApp reply sent.') : toast.warning(payload.sent.reason || 'Reply saved, but WhatsApp send was not confirmed.');
        refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Reply failed'); }
    });
  }

  function updateThreadState(mode: AiMode, successMessage: string) {
    if (!selected) return;
    startTransition(async () => {
      const response = await fetch('/api/whatsai/thread-state', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: selected.id, ai_mode: mode, status: mode === 'assistant' ? 'open' : 'pending_human', assigned_to: owner, internal_note: note, handoff_reason: mode === 'assistant' ? null : 'Manual operator takeover from inbox' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) { toast.error(payload?.error || 'Thread update failed'); return; }
      toast.success(successMessage); refresh();
    });
  }

  function saveContext() {
    if (!selected) return;
    startTransition(async () => {
      const response = await fetch('/api/whatsai/thread-state', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: selected.id, assigned_to: owner, internal_note: note }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) { toast.error(payload?.error || 'Context save failed'); return; }
      toast.success('Assignment and internal note saved.'); refresh();
    });
  }

  function draftSummary() {
    startTransition(async () => {
      const response = await fetch('/api/whatsai/owner-summary', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) { toast.error(payload?.error || 'Summary draft failed'); return; }
      toast.success('Daily owner summary drafted.');
    });
  }

  if (data.source === 'error') return <InboxErrorState message={data.error ?? 'Canonical conversation data could not be loaded.'} onRetry={refresh} />;
  if (!data.threads.length) return <InboxEmptyState onRefresh={refresh} />;

  const panel = selected ? <LeadPanel selected={selected} owner={owner} setOwner={setOwner} note={note} setNote={setNote} onSave={saveContext} onPause={() => updateThreadState('paused', 'AI paused. Human is in control.')} onResume={() => updateThreadState('assistant', 'AI resumed for this thread.')} pending={pending} /> : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 xl:hidden">
        {selected ? <Button asChild variant="outline" size="sm"><Link href="/chats"><ChevronLeft className="mr-1.5 h-4 w-4" />All chats</Link></Button> : <span className="text-sm font-semibold text-[#111b21]">Your inbox</span>}
        {selected ? <Button variant="outline" size="sm" onClick={() => setLeadOpen(true)}><PanelRight className="mr-1.5 h-4 w-4" />Lead info</Button> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_340px]">
        <Card id="inbox-list" className={cn('overflow-hidden border-[#d8dee4] bg-white shadow-sm', selected && 'hidden md:block')}>
          <CardHeader className="border-b border-[#d8dee4] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-[#00a884]" />Conversations</CardTitle><p className="mt-1 text-xs text-[#667781]">{data.source === 'supabase' ? 'Live WhatsApp threads' : 'Demo conversations'}</p></div>
              <Button variant="secondary" size="icon" onClick={refresh} aria-label="Refresh inbox" disabled={pending}><RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} /></Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-240px)] min-h-[420px] space-y-2 overflow-y-auto bg-[#f0f2f5] p-3">
            {data.threads.map((thread) => <ThreadListItem key={thread.id} thread={thread} active={selected?.id === thread.id} />)}
          </CardContent>
        </Card>

        <Card id="chat-view" className={cn('min-h-[620px] overflow-hidden border-[#d8dee4] bg-white shadow-sm', !selected && 'hidden md:block')}>
          <ChatHeader selected={selected} isPaused={isPaused} pending={pending} onPause={() => updateThreadState('paused', 'AI paused. Human is in control.')} onResume={() => updateThreadState('assistant', 'AI resumed for this thread.')} onLeadInfo={() => setLeadOpen(true)} />
          <CardContent className="flex min-h-[540px] flex-col p-0">
            {isPaused ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><div className="flex items-center gap-2 font-semibold"><PauseCircle className="h-4 w-4" />AI is currently paused. Human is in control.</div><p className="mt-1 text-xs text-amber-800">Replies from the owner are clearly marked in the history.</p></div> : null}
            {!isPaused && pending ? <div className="border-b border-[#d8dee4] bg-white px-4 py-2 text-xs text-[#667781]"><span className="mr-2 inline-flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884] [animation-delay:240ms]" /></span>AI is typing...</div> : null}
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#efeae2] p-4 sm:p-6">
              {selected && data.messages.length ? data.messages.map((message) => <MessageBubble key={message.id} message={message} />) : <div className="flex h-full items-center justify-center"><div className="max-w-sm rounded-2xl border border-dashed bg-white/90 p-6 text-center shadow-sm"><MessageCircle className="mx-auto h-9 w-9 text-slate-400" /><div className="mt-3 font-semibold">No messages in this thread yet</div><p className="mt-1 text-sm text-muted-foreground">The conversation exists, but no canonical messages are attached.</p></div></div>}
            </div>
            <div className="border-t border-[#d8dee4] bg-white p-4"><div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{selected ? `${selected.contactName} · ${selected.stage}` : 'Select a conversation'}</span>{selected ? <Badge variant={isPaused ? 'warning' : 'success'}>{isPaused ? 'Manual mode' : 'AI assist active'}</Badge> : null}</div><div className="flex gap-2"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isPaused ? 'Type a reply to send on WhatsApp.' : 'Pause AI first to take over this chat.'} rows={2} disabled={!selected || pending} className="min-h-[72px] resize-none" /><Button className="self-end" onClick={sendReply} disabled={!selected || !draft.trim() || pending}><Send className="mr-2 h-4 w-4" />Send</Button></div></div>
          </CardContent>
        </Card>

        <aside className="hidden xl:block">{panel}</aside>
      </div>

      <Sheet open={leadOpen} onOpenChange={setLeadOpen}><SheetContent side="right" className="w-full overflow-y-auto border-l-[#d8dee4] bg-[#f8fafb] sm:max-w-md"><SheetHeader className="mb-5"><SheetTitle>Lead information</SheetTitle><SheetDescription>Qualification, appointment, and owner controls.</SheetDescription></SheetHeader>{panel}</SheetContent></Sheet>
    </div>
  );
}

function ChatHeader({ selected, isPaused, pending, onPause, onResume, onLeadInfo }: { selected: WhatsAiThread | null; isPaused: boolean; pending: boolean; onPause: () => void; onResume: () => void; onLeadInfo: () => void }) {
  return <CardHeader className="border-b border-[#d8dee4] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3">{selected ? <div className="flex items-center gap-3"><Avatar className="h-11 w-11 border border-[#d8dee4]"><AvatarFallback className="bg-[#00a884] text-white">{initials(selected.contactName)}</AvatarFallback></Avatar><div><CardTitle className="text-lg">{selected.contactName}</CardTitle><p className="text-sm text-muted-foreground">{selected.phone}</p></div></div> : <CardTitle>Conversation</CardTitle>} {selected ? <div className="flex flex-wrap items-center gap-2"><Badge variant={selected.temperature === 'hot' ? 'destructive' : selected.temperature === 'warm' ? 'warning' : 'secondary'}>{selected.temperature} lead</Badge><Badge variant={isPaused ? 'warning' : 'success'}>{isPaused ? 'Human control' : 'AI active'}</Badge><Button className="xl:hidden" size="sm" variant="outline" onClick={onLeadInfo}><PanelRight className="mr-1.5 h-4 w-4" />Lead info</Button>{isPaused ? <Button size="sm" variant="success" onClick={onResume} disabled={pending}><RotateCcw className="mr-2 h-4 w-4" />Resume AI</Button> : <Button size="sm" variant="destructive" onClick={onPause} disabled={pending}><PauseCircle className="mr-2 h-4 w-4" />Take over</Button>}</div> : null}</div></CardHeader>;
}

function ThreadListItem({ thread, active }: { thread: WhatsAiThread; active: boolean }) {
  const state = thread.status === 'resolved' ? 'resolved' : thread.aiMode === 'manual' || thread.aiMode === 'paused' ? 'human' : 'active';
  return <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className={cn('block min-h-[80px] rounded-xl border border-transparent border-l-4 bg-white p-3 transition hover:border-[#00a884] hover:shadow-sm', active && 'border-[#00a884] bg-[#f8fffa] shadow-sm', thread.unreadCount > 0 && 'border-l-[#00a884]')}><div className="flex items-start gap-3"><Avatar className="h-11 w-11 shrink-0 border border-[#d8dee4]"><AvatarFallback className="bg-[#d9fdd3] text-[#075e54]">{initials(thread.contactName)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className={cn('h-2 w-2 shrink-0 rounded-full', state === 'active' ? 'bg-[#00a884]' : state === 'human' ? 'bg-amber-500' : 'bg-slate-400')} /><div className="truncate text-sm font-semibold text-[#111b21]">{thread.contactName}</div></div><div className="shrink-0 text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</div></div><div className="mt-1 truncate text-xs text-[#667781]">{thread.lastBody}</div><div className="mt-2 flex items-center gap-1.5">{thread.temperature === 'hot' ? <Flame className="h-3.5 w-3.5 text-red-500" /> : null}<Badge variant="outline" className="text-[10px]">{thread.stage}</Badge>{thread.unreadCount ? <Badge variant="default" className="text-[10px]">{thread.unreadCount} new</Badge> : null}</div></div></div></Link>;
}

function MessageBubble({ message }: { message: WhatsAiMessage }) {
  const outbound = message.direction === 'outbound';
  return <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}><div className="max-w-[88%] sm:max-w-[76%]"><div className={cn('mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide', outbound ? 'justify-end' : 'justify-start', message.authorType === 'ai' || message.authorType === 'human' ? 'text-[#075e54]' : 'text-[#667781]')}>{message.authorType === 'ai' ? <Bot className="h-3.5 w-3.5" /> : message.authorType === 'human' ? <UserRoundCheck className="h-3.5 w-3.5" /> : null}{message.authorType === 'customer' ? 'Customer' : message.authorType === 'human' ? 'Manual reply' : message.authorType === 'ai' ? 'AI reply' : 'System'}</div><div className={cn('rounded-2xl px-4 py-3 text-sm shadow-sm ring-1', outbound ? 'rounded-br-sm bg-[#d9fdd3] text-[#111b21] ring-[#c6edbd]' : 'rounded-bl-sm bg-white text-[#111b21] ring-[#d8dee4]')}><div className="whitespace-pre-wrap leading-relaxed">{message.body}</div><div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#667781]"><span>{formatTime(message.createdAt)}</span>{outbound ? <CheckCheck className="h-3 w-3" /> : null}</div></div></div></div>;
}

function LeadPanel({ selected, owner, setOwner, note, setNote, onSave, onPause, onResume, pending }: { selected: WhatsAiThread; owner: string; setOwner: (value: string) => void; note: string; setNote: (value: string) => void; onSave: () => void; onPause: () => void; onResume: () => void; pending: boolean }) {
  const isPaused = selected.aiMode === 'manual' || selected.aiMode === 'paused';
  return <div className="space-y-4"><Card className="border-[#d8dee4] bg-white shadow-sm"><CardHeader className="bg-[#075e54] p-4 text-white"><CardTitle className="flex items-center gap-2 text-base"><UserRoundCheck className="h-4 w-4" />Lead details</CardTitle><p className="text-xs text-white/80">Context for the next owner action.</p></CardHeader><CardContent className="space-y-4 p-4"><div className="rounded-2xl border border-[#d8dee4] bg-[#f0f2f5] p-3"><div className="font-semibold">{selected.contactName}</div><div className="mt-1 text-xs text-muted-foreground">{selected.phone}</div><div className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label="Stage" value={selected.stage} /><MiniMetric label="Temperature" value={selected.temperature} /></div></div><ContextLine icon={Clock3} label="Last message" value={formatTime(selected.lastMessageAt)} /><ContextLine icon={MessageCircle} label="Messages" value={`${selected.inboundCount} in / ${selected.outboundCount} out`} /><Separator /><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CheckCheck className="h-4 w-4 text-[#00a884]" />Qualification</div><div className="rounded-xl border bg-[#f8fafb] p-3 text-sm"><div>{selected.qualification.answered} of {selected.qualification.total} questions answered</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e9ed]"><div className="h-full rounded-full bg-[#00a884]" style={{ width: `${Math.min(100, (selected.qualification.answered / Math.max(1, selected.qualification.total)) * 100)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{selected.qualification.qualified ? 'Qualified for the next step.' : selected.qualification.nextQuestion ? `Next: ${selected.qualification.nextQuestion}` : 'AI is collecting the next answer.'}</p></div></div><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-[#00a884]" />Appointment</div><div className="rounded-xl border bg-[#f8fafb] p-3 text-sm">{selected.appointment ? <><div className="font-semibold">{selected.appointment.title}</div><div className="mt-1 text-muted-foreground">{formatTime(selected.appointment.scheduledAt)}</div><Badge className="mt-2" variant={selected.appointment.status === 'cancelled' ? 'destructive' : 'success'}>{selected.appointment.status.replace('_', ' ')}</Badge></> : <p className="text-muted-foreground">No appointment booked yet.</p>}</div></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Hot handoff</div><p className="mt-1 text-xs">{selected.hotHandoff ? `${selected.hotHandoff.priority} priority · ${selected.hotHandoff.reason}` : 'No active handoff. Use Take over when you need to step in.'}</p></div></CardContent></Card><Card className="border-[#d8dee4] bg-white shadow-sm"><CardHeader className="p-4"><CardTitle className="text-base">Owner controls</CardTitle></CardHeader><CardContent className="space-y-4 p-4 pt-0"><div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</label><div className="mt-2 grid grid-cols-2 gap-2">{ownerOptions.map((option) => <Button key={option} type="button" variant={owner === option ? 'default' : 'outline'} size="sm" className="justify-start truncate" onClick={() => setOwner(option)}>{option}</Button>)}</div></div><div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal note</label><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2" placeholder="Private note for your team." /></div><div className="flex gap-2">{isPaused ? <Button className="flex-1" variant="success" onClick={onResume} disabled={pending}><RotateCcw className="mr-2 h-4 w-4" />Resume AI</Button> : <Button className="flex-1" variant="destructive" onClick={onPause} disabled={pending}><PauseCircle className="mr-2 h-4 w-4" />Take over</Button>}<Button variant="outline" onClick={onSave} disabled={pending}>Save</Button></div></CardContent></Card></div>;
}

function InboxEmptyState({ onRefresh }: { onRefresh: () => void }) { return <div className="rounded-3xl border border-dashed border-[#b7bdc3] bg-gradient-to-br from-white via-[#e7fce3] to-[#f0f2f5] p-8 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9fdd3] text-[#075e54]"><Inbox className="h-8 w-8" /></div><h2 className="mt-5 text-xl font-semibold">No conversations yet</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Send a WhatsApp test message or connect a business channel to start the inbox.</p><div className="mt-6 flex justify-center gap-2"><Button asChild><Link href="/assistant-setup">Open Assistant Setup</Link></Button><Button variant="outline" onClick={onRefresh}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></div>; }
function InboxErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-950"><div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-6 w-6" /><div><h2 className="text-lg font-semibold">Inbox could not load</h2><p className="mt-1 text-sm">{message}</p><p className="mt-2 text-xs">Check Supabase credentials and the canonical conversation tables, then retry.</p><Button className="mt-5" variant="destructive" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div></div></div>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white px-3 py-2"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="truncate text-sm font-semibold">{value}</div></div>; }
function ContextLine({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><span className="text-right font-medium">{value}</span></div>; }
function initials(name: string) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WA'; }
function formatTime(value: string) { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value)); }
