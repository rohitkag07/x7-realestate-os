'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bot, CalendarDays, CheckCheck, ChevronLeft, Clock3, Flame, Inbox, MessageCircle, PanelRight, PauseCircle, RefreshCw, RotateCcw, Send, ShieldAlert, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiMessage, WhatsAiThread } from '@/lib/whatsai-data';
import type { AiMode, ConversationStage } from '@/types/database';

type Props = { data: WhatsAiInboxData };
const ownerOptions = ['Owner Desk', 'Arjun Sales', 'Ritika Closer', 'Ghost Closer Desk'];
type TeamMember = {
  user_id: string;
  display_name: string | null;
  role: string;
};

export function WhatsAiInbox({ data }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState(data.selectedThread?.assignedTo ?? 'Owner Desk');
  const [note, setNote] = useState(data.selectedThread?.internalNote ?? '');
  const [leadOpen, setLeadOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pending, startTransition] = useTransition();
  const selected = data.selectedThread;
  const isPaused = selected?.aiMode === 'manual' || selected?.aiMode === 'paused';
  const refresh = () => router.refresh();
  const visibleThreads = data.threads.filter((thread) => `${thread.contactName} ${thread.phone} ${thread.lastBody}`.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    setOwner(selected?.assignedTo ?? 'Unassigned');
    setNote(selected?.internalNote ?? '');
    setDraft('');
  }, [selected?.id, selected?.assignedTo, selected?.internalNote]);

  useEffect(() => {
    if (!selected?.businessId) return;
    void fetch(`/api/chats/team?business_id=${encodeURIComponent(selected.businessId)}`)
      .then((response) => response.json())
      .then((payload) => setTeamMembers(payload?.ok ? payload.members : []))
      .catch(() => setTeamMembers([]));
  }, [selected?.businessId]);

  function assignTeamMember(userId: string) {
    if (!selected?.businessId) return;
    startTransition(async () => {
      const response = await fetch(`/api/chats/${selected.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: selected.businessId,
          assigned_user_id: userId === 'unassigned' ? null : userId,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Assignment failed.');
        return;
      }
      setOwner(payload.thread.assigned_to || 'Unassigned');
      toast.success('Conversation assigned.');
      refresh();
    });
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
        payload.ok ? toast.success('Manual WhatsApp reply sent.') : toast.warning(payload.sent.reason || 'Reply saved, but WhatsApp send was not confirmed.');
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
          handoff_reason: mode === 'assistant' ? null : 'Manual operator takeover from inbox',
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

  function updateStage(stage: ConversationStage) {
    if (!selected?.contactId || !selected.businessId) {
      toast.error('This conversation is not linked to a business contact yet.');
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/leads/${selected.contactId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: selected.businessId, stage }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Lead stage update failed.');
        return;
      }
      toast.success(`Lead moved to ${stage}.`);
      refresh();
    });
  }

  function draftSummary() {
    startTransition(async () => {
      const response = await fetch('/api/whatsai/owner-summary', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error || 'Summary draft failed');
        return;
      }
      toast.success('Daily owner summary drafted.');
    });
  }

  if (data.source === 'error') return <InboxErrorState message={data.error ?? 'Canonical conversation data could not be loaded.'} onRetry={refresh} />;
  if (!data.threads.length) return <InboxEmptyState onRefresh={refresh} />;

  const panel = selected ? <LeadPanel selected={selected} owner={owner} setOwner={setOwner} teamMembers={teamMembers} onAssign={assignTeamMember} note={note} setNote={setNote} onSave={saveContext} onPause={() => updateThreadState('paused', 'AI paused. Human is in control.')} onResume={() => updateThreadState('assistant', 'AI resumed for this thread.')} onStageChange={updateStage} pending={pending} /> : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 xl:hidden">
        {selected ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/chats">
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              All chats
            </Link>
          </Button>
        ) : (
          <span className="text-sm font-semibold text-[#111b21]">Your inbox</span>
        )}
        {selected ? (
          <Button variant="outline" size="sm" onClick={() => setLeadOpen(true)}>
            <PanelRight className="mr-1.5 h-4 w-4" />
            Lead info
          </Button>
        ) : null}
      </div>

      <div className="grid gap-0 overflow-hidden rounded-[18px] border border-[#d8dee4] bg-white md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
        <Card id="inbox-list" className={cn('overflow-hidden rounded-none border-0 border-r border-[#d8dee4] bg-white shadow-none', selected && 'hidden md:block')}>
          <CardHeader className="border-b border-[#d8dee4] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Inbox className="h-4 w-4 text-[#00a884]" />
                  Conversations
                </CardTitle>
                <p className="mt-1 text-xs text-[#667781]">{data.source === 'supabase' ? 'Live WhatsApp threads' : 'Demo conversations'}</p>
              </div>
              <Button variant="secondary" size="icon" onClick={refresh} aria-label="Refresh inbox" disabled={pending}>
                <RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <div className="border-b border-[#d8dee4] bg-white p-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or message" className="h-10 rounded-full bg-[#f0f2f5]" />
          </div>
          <CardContent className="h-[calc(100dvh-230px)] min-h-[520px] space-y-1 overflow-y-auto bg-[#f6f8f7] p-2">{visibleThreads.length ? visibleThreads.map((thread) => <ThreadListItem key={thread.id} thread={thread} active={selected?.id === thread.id} />) : <div className="p-6 text-center text-sm text-[#667781]">No chats match your search.</div>}</CardContent>
        </Card>

        <Card id="chat-view" className={cn('min-h-[calc(100dvh-112px)] overflow-hidden rounded-none border-0 bg-white shadow-none md:min-h-[720px]', !selected && 'hidden md:block')}>
          <ChatHeader selected={selected} isPaused={isPaused} pending={pending} onPause={() => updateThreadState('paused', 'AI paused. Human is in control.')} onResume={() => updateThreadState('assistant', 'AI resumed for this thread.')} />
          <CardContent className="flex min-h-[540px] flex-col p-0">
            {isPaused ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <div className="flex items-center gap-2 font-semibold">
                  <PauseCircle className="h-4 w-4" />
                  Auto-replies are paused. You are in control.
                </div>
                <p className="mt-1 text-xs text-amber-800">Replies from the owner are clearly marked in the history.</p>
              </div>
            ) : null}
            {!isPaused && pending ? (
              <div className="border-b border-[#d8dee4] bg-white px-4 py-2 text-xs text-[#667781]">
                <span className="mr-2 inline-flex gap-1">
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884]" />
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884] [animation-delay:120ms]" />
                  <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00a884] [animation-delay:240ms]" />
                </span>
                Preparing reply...
              </div>
            ) : null}
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#efeae2] p-4 sm:p-6">
              {selected && data.messages.length ? (
                data.messages.map((message) => <MessageBubble key={message.id} message={message} />)
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm rounded-2xl bg-white/90 p-7 text-center">
                    <MessageCircle className="mx-auto h-9 w-9 text-slate-400" />
                    <div className="mt-3 font-semibold">{selected ? 'No messages in this thread yet' : 'Choose a customer conversation'}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected ? 'This customer is connected, but no message history is available yet.' : 'Select a customer from the inbox to read messages and take action.'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-[#d8dee4] bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{selected ? `${selected.contactName} · ${selected.stage}` : 'Select a conversation'}</span>
                {selected ? <span className={cn('font-medium', isPaused ? 'text-[#b45309]' : 'text-[#087d70]')}>{isPaused ? 'You are replying' : 'Auto-replies active'}</span> : null}
              </div>
              <div className="flex gap-2">
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isPaused ? 'Type a reply to send on WhatsApp.' : 'Pause AI first to take over this chat.'} rows={2} disabled={!selected || pending} className="min-h-[72px] resize-none" />
                <Button className="self-end" onClick={sendReply} disabled={!selected || !draft.trim() || pending}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="hidden overflow-y-auto border-l border-[#d8dee4] bg-[#f8fafb] p-3 xl:block">{panel}</aside>
      </div>

      <Sheet open={leadOpen} onOpenChange={setLeadOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l-[#d8dee4] bg-[#f8fafb] sm:max-w-md">
          <SheetHeader className="mb-5">
            <SheetTitle>Lead information</SheetTitle>
            <SheetDescription>Qualification, appointment, and owner controls.</SheetDescription>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatHeader({ selected, isPaused, pending, onPause, onResume }: { selected: WhatsAiThread | null; isPaused: boolean; pending: boolean; onPause: () => void; onResume: () => void }) {
  return (
    <CardHeader className="border-b border-[#d8dee4] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selected ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-[#d8dee4]">
              <AvatarFallback className="bg-[#00a884] text-white">{initials(selected.contactName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{selected.contactName}</CardTitle>
              <p className="text-sm text-muted-foreground">{selected.phone}</p>
            </div>
          </div>
        ) : (
          <CardTitle>Conversation</CardTitle>
        )}{' '}
        {selected ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-2 text-xs font-medium', isPaused ? 'text-[#b45309]' : 'text-[#087d70]')}><span className={cn('h-2 w-2 rounded-full', isPaused ? 'bg-[#d97706]' : 'bg-[#00a884]')} />{isPaused ? 'Needs you' : 'Automated'}</span>
            {isPaused ? (
              <Button size="sm" variant="success" onClick={onResume} disabled={pending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resume assistant
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={onPause} disabled={pending}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Take over
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </CardHeader>
  );
}

function ThreadListItem({ thread, active }: { thread: WhatsAiThread; active: boolean }) {
  const state = thread.status === 'resolved' ? 'resolved' : thread.aiMode === 'manual' || thread.aiMode === 'paused' ? 'human' : 'active';
  return (
    <Link href={`/chats?phone=${encodeURIComponent(thread.phone)}`} className={cn('wa-row block min-h-[80px] rounded-xl border border-transparent border-l-[3px] bg-white p-3 hover:border-[#b7ddd2]', active && 'border-[#b7ddd2] border-l-[#00a884] bg-[#edf8f4]', thread.unreadCount > 0 && 'border-l-[#00a884]')}>
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 border border-[#d8dee4]">
          <AvatarFallback className="bg-[#d9fdd3] text-[#075e54]">{initials(thread.contactName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', state === 'active' ? 'bg-[#00a884]' : state === 'human' ? 'bg-amber-500' : 'bg-slate-400')} />
              <div className="truncate text-sm font-semibold text-[#111b21]">{thread.contactName}</div>
            </div>
            <div className="shrink-0 text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</div>
          </div>
          <div className="mt-1 truncate text-xs text-[#667781]">{thread.lastBody}</div>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-medium text-[#667781]">
            {thread.temperature === 'hot' ? <Flame className="h-3.5 w-3.5 text-red-500" /> : null}
            <span className="capitalize">{thread.stage}</span>
            {thread.unreadCount ? (
              <Badge variant="default" className="ml-auto text-[10px]">
                {thread.unreadCount} new
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function MessageBubble({ message }: { message: WhatsAiMessage }) {
  const outbound = message.direction === 'outbound';
  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[88%] sm:max-w-[76%]">
        <div className={cn('mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide', outbound ? 'justify-end' : 'justify-start', message.authorType === 'ai' || message.authorType === 'human' ? 'text-[#075e54]' : 'text-[#667781]')}>
          {message.authorType === 'ai' ? <Bot className="h-3.5 w-3.5" /> : message.authorType === 'human' ? <UserRoundCheck className="h-3.5 w-3.5" /> : null}
          {message.authorType === 'customer' ? 'Customer' : message.authorType === 'human' ? 'You' : message.authorType === 'ai' ? 'Auto-reply' : 'System'}
        </div>
        <div className={cn('px-4 py-3 text-sm shadow-sm ring-1', outbound ? 'rounded-[12px_2px_12px_12px] bg-[#d9fdd3] text-[#111b21] ring-[#c6edbd]' : 'rounded-[2px_12px_12px_12px] bg-white text-[#111b21] ring-[#d8dee4]')}>
          <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
            <span>{formatTime(message.createdAt)}</span>
            {outbound ? <CheckCheck className="h-3 w-3" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadPanel({ selected, owner, setOwner, teamMembers, onAssign, note, setNote, onSave, onPause, onResume, onStageChange, pending }: { selected: WhatsAiThread; owner: string; setOwner: (value: string) => void; teamMembers: TeamMember[]; onAssign: (userId: string) => void; note: string; setNote: (value: string) => void; onSave: () => void; onPause: () => void; onResume: () => void; onStageChange: (stage: ConversationStage) => void; pending: boolean }) {
  const isPaused = selected.aiMode === 'manual' || selected.aiMode === 'paused';
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-[#d8dee4] bg-white">
        <CardHeader className="bg-[#075e54] p-4 text-white">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundCheck className="h-4 w-4" />
            Lead details
          </CardTitle>
          <p className="text-xs text-white/80">Context for the next owner action.</p>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="rounded-2xl border border-[#d8dee4] bg-[#f0f2f5] p-3">
            <div className="font-semibold">{selected.contactName}</div>
            <div className="mt-1 text-xs text-muted-foreground">{selected.phone}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniMetric label="Temperature" value={selected.temperature} />
              <StageSelector stage={selected.stage} onChange={onStageChange} disabled={pending} />
            </div>
          </div>
          <ContextLine icon={Clock3} label="Last message" value={formatTime(selected.lastMessageAt)} />
          <ContextLine icon={MessageCircle} label="Messages" value={`${selected.inboundCount} in / ${selected.outboundCount} out`} />
          <Separator />
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CheckCheck className="h-4 w-4 text-[#00a884]" />
              Qualification
            </div>
            <div className="rounded-xl border bg-[#f8fafb] p-3 text-sm">
              <div>
                {selected.qualification.answered} of {selected.qualification.total} questions answered
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e9ed]">
                <div
                  className="h-full rounded-full bg-[#00a884]"
                  style={{
                    width: `${Math.min(100, (selected.qualification.answered / Math.max(1, selected.qualification.total)) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selected.qualification.qualified ? 'Qualified for the next step.' : selected.qualification.nextQuestion ? `Next: ${selected.qualification.nextQuestion}` : 'AI is collecting the next answer.'}</p>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-[#00a884]" />
              Appointment
            </div>
            <div className="rounded-xl border bg-[#f8fafb] p-3 text-sm">
              {selected.appointment ? (
                <>
                  <div className="font-semibold">{selected.appointment.title}</div>
                  <div className="mt-1 text-muted-foreground">{formatTime(selected.appointment.scheduledAt)}</div>
                  <Badge className="mt-2" variant={selected.appointment.status === 'cancelled' ? 'destructive' : 'success'}>
                    {selected.appointment.status.replace('_', ' ')}
                  </Badge>
                </>
              ) : (
                <p className="text-muted-foreground">No appointment booked yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Hot handoff
            </div>
            <p className="mt-1 text-xs">{selected.hotHandoff ? `${selected.hotHandoff.priority} priority · ${selected.hotHandoff.reason}` : 'No active handoff. Use Take over when you need to step in.'}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-[#d8dee4] bg-white">
        <CardHeader className="p-4">
          <CardTitle className="text-base">Owner controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign to</label>
            <Select value={selected.assignedUserId ?? 'unassigned'} onValueChange={onAssign}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={owner || 'Unassigned'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.display_name || member.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Current: {owner || 'Unassigned'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal note</label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2" placeholder="Private note for your team." />
          </div>
          <div className="flex gap-2">
            {isPaused ? (
              <Button className="flex-1" variant="success" onClick={onResume} disabled={pending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resume assistant
              </Button>
            ) : (
              <Button className="flex-1" variant="destructive" onClick={onPause} disabled={pending}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Take over
              </Button>
            )}
            <Button variant="outline" onClick={onSave} disabled={pending}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageSelector({ stage, onChange, disabled }: { stage: ConversationStage; onChange: (stage: ConversationStage) => void; disabled: boolean }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">Stage</div>
      <Select value={stage} onValueChange={(value) => onChange(value as ConversationStage)} disabled={disabled}>
        <SelectTrigger className={cn('mt-1 h-7 border-0 px-0 text-xs font-semibold shadow-none focus:ring-0', stageTone(stage))}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const stageOptions: Array<{ value: ConversationStage; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'interested', label: 'Interested' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
  { value: 'cold', label: 'Cold' },
];

function stageTone(stage: ConversationStage) {
  return {
    new: 'text-blue-700',
    interested: 'text-emerald-700',
    negotiating: 'text-orange-700',
    booked: 'text-purple-700',
    lost: 'text-red-700',
    cold: 'text-slate-600',
  }[stage];
}

function InboxEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#b7bdc3] bg-gradient-to-br from-white via-[#e7fce3] to-[#f0f2f5] p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9fdd3] text-[#075e54]">
        <Inbox className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">No conversations yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Send a WhatsApp test message or connect a business channel to start the inbox.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild>
          <Link href="/assistant-setup">Open Assistant Setup</Link>
        </Button>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
function InboxErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-6 w-6" />
        <div>
          <h2 className="text-lg font-semibold">Inbox could not load</h2>
          <p className="mt-1 text-sm">{message}</p>
          <p className="mt-2 text-xs">Check Supabase credentials and the canonical conversation tables, then retry.</p>
          <Button className="mt-5" variant="destructive" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
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
function ContextLine({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function initials(name: string) {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'WA'
  );
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
