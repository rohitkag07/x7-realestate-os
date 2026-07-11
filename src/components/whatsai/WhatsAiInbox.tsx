'use client';

import { useMemo, useState, useTransition } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bot,
  CheckCheck,
  Clock3,
  Flame,
  Inbox,
  MessageCircle,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  UserRoundCheck,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiMessage, WhatsAiThread } from '@/lib/whatsai-data';
import type { AiMode } from '@/types/database';

type WhatsAiInboxProps = {
  data: WhatsAiInboxData;
};

const ownerOptions = ['Owner Desk', 'Arjun Sales', 'Ritika Closer', 'Ghost Closer Desk'];

export function WhatsAiInbox({ data }: WhatsAiInboxProps) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [owner, setOwner] = useState(data.selectedThread?.assignedTo ?? 'Owner Desk');
  const [note, setNote] = useState(data.selectedThread?.internalNote ?? '');
  const [pending, startTransition] = useTransition();
  const selected = data.selectedThread;

  const isPaused = selected?.aiMode === 'manual' || selected?.aiMode === 'paused';
  const ownerSummary = useMemo(() => {
    if (!selected) return 'No thread selected.';
    return `${selected.contactName} · ${selected.stage} · ${selected.temperature} lead`;
  }, [selected]);

  function refresh() {
    router.refresh();
  }

  function sendReply() {
    if (!selected || !draft.trim()) return;

    startTransition(async () => {
      try {
        const response = await fetch('/api/whatsai/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            builder_id: selected.builderId,
            business_id: selected.businessId,
            lead_id: selected.leadId,
            phone: selected.phone,
            body: draft.trim(),
            agent: 'whatsai-operator',
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!payload?.sent) throw new Error(payload?.error || 'Reply failed');

        setDraft('');
        if (payload.ok) {
          toast.success('Manual WhatsApp reply sent.');
        } else {
          toast.warning(payload.sent.reason || payload.sent.error || 'Reply saved but WhatsApp send was not confirmed.');
        }
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Reply failed');
      }
    });
  }

  function updateThreadState(mode: AiMode, successMessage: string) {
    if (!selected) return;

    startTransition(async () => {
      const response = await fetch('/api/whatsai/thread-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: selected.id,
          ai_mode: mode,
          status: mode === 'assistant' ? 'open' : 'pending_human',
          assigned_to: owner,
          internal_note: note,
          handoff_reason: mode === 'assistant' ? null : 'Manual operator takeover from inbox command center',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Thread update failed');
        return;
      }
      toast.success(successMessage);
      refresh();
    });
  }

  function saveContext() {
    if (!selected) return;

    startTransition(async () => {
      const response = await fetch('/api/whatsai/thread-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: selected.id,
          assigned_to: owner,
          internal_note: note,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Context save failed');
        return;
      }
      toast.success('Assignment and internal note saved.');
      refresh();
    });
  }

  function draftSummary() {
    startTransition(async () => {
      const response = await fetch('/api/whatsai/owner-summary', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Summary draft failed');
        return;
      }
      toast.success('Daily owner summary drafted.');
    });
  }

  if (data.source === 'error') {
    return <InboxErrorState message={data.error ?? 'Canonical conversation data could not be loaded.'} onRetry={refresh} />;
  }

  if (!data.threads.length) {
    return <InboxEmptyState onRefresh={refresh} />;
  }

  return (
    <>
      <MobileInboxNav selected={selected} />
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <Card id="inbox-list" className="scroll-mt-24 overflow-hidden border-[#d8dee4] bg-white shadow-sm">
        <CardHeader className="border-b border-[#d8dee4] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-[#111b21]">
                <Inbox className="h-4 w-4 text-[#00a884]" />
                Conversations
              </CardTitle>
              <p className="mt-1 text-xs text-[#667781]">
                {data.source === 'supabase' ? 'Live WhatsApp threads' : 'Demo conversations'}
              </p>
            </div>
            <Button variant="secondary" size="icon" onClick={refresh} aria-label="Refresh inbox" disabled={pending}>
              <RefreshCw className={cn('h-4 w-4', pending ? 'animate-spin' : '')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[70vh] min-h-[360px] space-y-2 overflow-y-auto bg-[#f0f2f5] p-2 xl:max-h-[calc(100vh-250px)] xl:min-h-[520px]">
          {data.threads.map((thread) => (
            <ThreadListItem key={thread.id} thread={thread} active={selected?.id === thread.id} />
          ))}
        </CardContent>
      </Card>

      <Card id="chat-view" className="scroll-mt-24 min-h-[620px] overflow-hidden border-[#d8dee4] bg-white shadow-sm xl:min-h-[720px]">
        <ChatHeader selected={selected} isPaused={isPaused} pending={pending} onPause={() => updateThreadState('paused', 'AI paused. Human is in control.')} onResume={() => updateThreadState('assistant', 'AI resumed for this thread.')} />
        <CardContent className="flex min-h-[540px] flex-col p-0 xl:min-h-[640px]">
          {isPaused ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <PauseCircle className="h-4 w-4" />
                AI is currently paused. Human is in control.
              </div>
              <p className="mt-1 text-xs text-amber-800">Operator replies are marked clearly and saved in the conversation history.</p>
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#efeae2] p-4">
            {data.messages.length ? data.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            )) : (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-dashed bg-white/90 p-6 text-center shadow-sm">
                  <MessageCircle className="mx-auto h-9 w-9 text-slate-400" />
                  <div className="mt-3 font-semibold">No messages in this thread yet</div>
                  <p className="mt-1 text-sm text-muted-foreground">The thread exists, but no canonical conversation_messages rows are attached.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#d8dee4] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{ownerSummary}</span>
              <Badge variant={isPaused ? 'warning' : 'success'}>{isPaused ? 'Manual mode' : 'AI assist active'}</Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isPaused ? 'Type a reply to send on WhatsApp.' : 'Pause AI first if you want to take over this chat.'}
                rows={3}
                disabled={!selected || pending}
                className="min-h-[96px] flex-1 resize-none"
              />
              <Button className="self-end sm:h-[96px]" onClick={sendReply} disabled={!selected || !draft.trim() || pending}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <aside id="lead-panel" className="scroll-mt-24 space-y-4">
        <ControlCard data={data} onDraftSummary={draftSummary} pending={pending} />

        {selected ? (
          <Card className="border-[#d8dee4] bg-white shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRoundCheck className="h-4 w-4 text-[#00a884]" />
                Lead Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 text-sm">
              <div className="rounded-2xl border border-[#d8dee4] bg-[#f0f2f5] p-3">
                <div className="font-semibold">{selected.contactName}</div>
                <div className="mt-1 text-xs text-muted-foreground">{selected.phone}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MiniMetric label="Stage" value={selected.stage} />
                  <MiniMetric label="Temp" value={selected.temperature} />
                </div>
              </div>

              <ContextLine icon={Clock3} label="Last message" value={formatTime(selected.lastMessageAt)} />
              <ContextLine icon={Bot} label="AI state" value={selected.aiMode} />
              <ContextLine icon={MessageCircle} label="Messages" value={`${selected.inboundCount} in / ${selected.outboundCount} out`} />
              <ContextLine
                icon={CheckCheck}
                label="Qualification"
                value={`${selected.qualification.answered}/${selected.qualification.total}${selected.qualification.qualified ? ' qualified' : selected.qualification.nextQuestion ? ` next: ${selected.qualification.nextQuestion}` : ''}`}
              />
              <ContextLine
                icon={Clock3}
                label="Appointment"
                value={selected.appointment ? `${selected.appointment.status} · ${formatTime(selected.appointment.scheduledAt)}` : 'Not booked'}
              />

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment owner</label>
                <div className="grid grid-cols-2 gap-2">
                  {ownerOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={owner === option ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start truncate"
                      onClick={() => setOwner(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {!ownerOptions.includes(owner) ? <Input value={owner} onChange={(event) => setOwner(event.target.value)} /> : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Private note for your team. Customers will not see this." />
              </div>

              <div className={cn('rounded-xl border p-3 text-xs', selected.status === 'pending_human' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'bg-muted/40 text-muted-foreground')}>
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Hot Handoff
                </div>
                {selected.hotHandoff
                  ? `${selected.hotHandoff.priority} · ${selected.hotHandoff.reason} (${selected.hotHandoff.status})`
                  : selected.status === 'pending_human'
                    ? selected.handoffReason || 'Human review active.'
                    : 'No active handoff. AI can continue replying.'}
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>

              <Button className="w-full" variant="outline" onClick={saveContext} disabled={pending}>
                Save panel context
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </aside>
      </div>
    </>
  );
}

function ChatHeader({
  selected,
  isPaused,
  pending,
  onPause,
  onResume,
}: {
  selected: WhatsAiThread | null;
  isPaused: boolean;
  pending: boolean;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <CardHeader className="border-b border-[#d8dee4] bg-white p-4">
      {selected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-[#d8dee4]">
              <AvatarFallback className="bg-[#00a884] text-white">{initials(selected.contactName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{selected.contactName}</CardTitle>
              <p className="text-sm text-muted-foreground">{selected.phone}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={selected.temperature === 'hot' ? 'destructive' : selected.temperature === 'warm' ? 'warning' : 'secondary'}>
              {selected.temperature}
            </Badge>
            <Badge variant={isPaused ? 'warning' : 'success'}>{isPaused ? 'Human control' : 'AI active'}</Badge>
            {isPaused ? (
              <Button size="sm" variant="success" onClick={onResume} disabled={pending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resolve / Resume AI
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={onPause} disabled={pending}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Pause AI / Takeover
              </Button>
            )}
          </div>
        </div>
      ) : (
        <CardTitle>Conversation</CardTitle>
      )}
    </CardHeader>
  );
}

function MobileInboxNav({ selected }: { selected: WhatsAiThread | null }) {
  return (
    <div className="sticky top-16 z-20 -mx-1 mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#d8dee4] bg-white/95 p-2 shadow-sm backdrop-blur xl:hidden">
      <a href="#inbox-list" className="shrink-0 rounded-xl bg-[#00a884] px-3 py-2 text-xs font-semibold text-white">
        Inbox
      </a>
      <a href="#chat-view" className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold text-foreground">
        Chat{selected ? ` · ${selected.contactName.slice(0, 14)}` : ''}
      </a>
      <a href="#lead-panel" className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold text-foreground">
        Lead Panel
      </a>
    </div>
  );
}

function ThreadListItem({ thread, active }: { thread: WhatsAiThread; active: boolean }) {
  const isPaused = thread.aiMode === 'manual' || thread.aiMode === 'paused';

  return (
    <Link
      href={`/conversations?phone=${encodeURIComponent(thread.phone)}`}
      className={cn(
        'block rounded-2xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#00a884] hover:bg-white hover:shadow-md',
        active ? 'border-[#00a884] bg-white shadow-sm ring-2 ring-[#d9fdd3]' : 'border-transparent bg-white/80',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border border-[#d8dee4]">
          <AvatarFallback className="bg-[#d9fdd3] text-[#075e54]">{initials(thread.contactName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">{thread.contactName}</div>
            <div className="text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</div>
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{thread.lastBody}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {thread.temperature === 'hot' ? <Flame className="h-3.5 w-3.5 text-red-500" /> : null}
            <Badge variant="outline" className="text-[10px]">{thread.stage}</Badge>
            <Badge variant={isPaused ? 'warning' : 'success'} className="text-[10px]">{isPaused ? 'manual' : 'AI'}</Badge>
            {thread.unreadCount ? <Badge variant="default" className="text-[10px]">{thread.unreadCount} unread</Badge> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function MessageBubble({ message }: { message: WhatsAiMessage }) {
  const outbound = message.direction === 'outbound';
  const human = message.authorType === 'human';
  const ai = message.authorType === 'ai';

  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[84%] sm:max-w-[76%]', outbound ? 'items-end' : 'items-start')}>
        <div className={cn('mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide', outbound ? 'justify-end' : 'justify-start')}>
          {ai ? <Bot className="h-3.5 w-3.5 text-[#075e54]" /> : null}
          {human ? <UserRoundCheck className="h-3.5 w-3.5 text-[#075e54]" /> : null}
          <span className={cn(ai || human ? 'text-[#075e54]' : 'text-[#667781]')}>
            {message.authorType === 'customer' ? 'Customer' : message.authorType === 'human' ? 'Manual reply' : message.authorType === 'ai' ? 'AI reply' : 'System'}
          </span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm shadow-sm ring-1',
            outbound ? 'rounded-br-sm bg-[#d9fdd3] text-[#111b21] ring-[#c6edbd]' : null,
            !outbound ? 'rounded-bl-sm bg-white text-[#111b21] ring-[#d8dee4]' : null,
          )}
        >
          <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
            <span>{formatTime(message.createdAt)}</span>
            {outbound ? <CheckCheck className="h-3 w-3" /> : null}
            <span>{message.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlCard({ data, onDraftSummary, pending }: { data: WhatsAiInboxData; onDraftSummary: () => void; pending: boolean }) {
  return (
    <Card className="overflow-hidden border-[#d8dee4] bg-white shadow-sm">
      <CardHeader className="bg-[#075e54] p-4 text-white">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[#d9fdd3]" />
          Today at a glance
        </CardTitle>
        <p className="text-xs text-white/80">Simple owner view for the WhatsApp desk.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <Metric label="Threads" value={data.summary.metrics.totalThreads} />
        <Metric label="Unread" value={data.summary.metrics.unreadThreads} />
        <Metric label="Hot leads" value={data.summary.metrics.hotThreads} />
        <Metric label="AI paused" value={data.summary.metrics.aiPausedThreads} />
        <Metric label="Inbound today" value={data.summary.metrics.inboundToday} />
        <Metric label="Outbound today" value={data.summary.metrics.outboundToday} />
        <Button className="w-full" variant="outline" onClick={onDraftSummary} disabled={pending}>
          <Wand2 className="mr-2 h-4 w-4" />
          Draft owner summary
        </Button>
      </CardContent>
    </Card>
  );
}

function InboxEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#b7bdc3] bg-gradient-to-br from-white via-[#e7fce3] to-[#f0f2f5] p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9fdd3] text-[#075e54]">
        <Inbox className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">No conversations yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        WhatsAI is ready. Send a WhatsApp test message or connect a business channel to start the inbox.
      </p>
      <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
        <EmptyStep index="1" title="Connect" body="Finish Assistant Setup with Phone Number ID and verify token." />
        <EmptyStep index="2" title="Send" body="Send a real WhatsApp test message to the connected number." />
        <EmptyStep index="3" title="Verify" body="This page should show the new thread and qualification step." />
      </div>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/assistant-setup">Open Assistant Setup</Link>
        </Button>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh inbox
        </Button>
      </div>
    </div>
  );
}

function EmptyStep({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 p-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{index}</div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function InboxErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 p-6 text-red-950 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Canonical inbox fetch failed</h2>
            <p className="mt-1 text-sm text-red-800">{message}</p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-red-700">
              Retry first. If it repeats, check Supabase credentials and migrations for conversation_threads, conversation_messages, and conversation_contacts.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="destructive" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href="/assistant-setup">Check setup</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
      <div className="flex items-center justify-between rounded-xl border border-[#d8dee4] bg-[#f0f2f5] px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function ContextLine({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'WA';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
