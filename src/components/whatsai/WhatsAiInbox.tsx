'use client';

import { useState, useTransition } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  Bot,
  CheckCheck,
  Clock,
  Flame,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  UserRoundCheck,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { WhatsAiInboxData, WhatsAiThread } from '@/lib/whatsai-data';

type WhatsAiInboxProps = {
  data: WhatsAiInboxData;
};

export function WhatsAiInbox({ data }: WhatsAiInboxProps) {
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const selected = data.selectedThread;

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
          toast.success('WhatsApp reply sent.');
        } else {
          toast.warning(payload.sent.reason || payload.sent.error || 'Reply saved but WhatsApp send was not confirmed.');
        }
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Reply failed');
      }
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

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Inbox</CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.source === 'supabase' ? 'Live WhatsApp conversations' : 'Demo fallback conversations'}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.location.reload()} aria-label="Refresh inbox">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[680px] space-y-2 overflow-y-auto p-2">
          {data.threads.map((thread) => (
            <ThreadListItem key={thread.id} thread={thread} active={selected?.phone === thread.phone} />
          ))}
          {!data.threads.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No WhatsApp messages yet. Connect webhook or send a test message.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="min-h-[720px] overflow-hidden">
        <CardHeader className="border-b p-4">
          {selected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(selected.contactName)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selected.contactName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.phone}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={selected.temperature === 'hot' ? 'destructive' : selected.temperature === 'warm' ? 'warning' : 'secondary'}>
                  {selected.temperature}
                </Badge>
                <Badge variant={selected.status === 'pending_human' ? 'warning' : 'success'}>
                  {selected.status === 'pending_human' ? 'Needs human' : 'AI active'}
                </Badge>
              </div>
            </div>
          ) : (
            <CardTitle>Conversation</CardTitle>
          )}
        </CardHeader>

        <CardContent className="flex min-h-[640px] flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {data.messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.direction === 'outbound' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                    message.direction === 'outbound'
                      ? 'rounded-br-sm bg-emerald-600 text-white'
                      : 'rounded-bl-sm border bg-white text-slate-900',
                  )}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
                  <div className={cn('mt-2 flex items-center justify-end gap-1 text-[10px]', message.direction === 'outbound' ? 'text-white/75' : 'text-muted-foreground')}>
                    <span>{formatTime(message.createdAt)}</span>
                    {message.direction === 'outbound' ? <CheckCheck className="h-3 w-3" /> : null}
                    <span>{message.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Manual reply likho... AI assistant paused nahi hoga, but operator reply audit me save hoga."
                rows={3}
                disabled={!selected || pending}
              />
              <Button className="self-end" onClick={sendReply} disabled={!selected || !draft.trim() || pending}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">WhatsAI Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <Metric label="Threads" value={data.summary.metrics.totalThreads} />
            <Metric label="Unread" value={data.summary.metrics.unreadThreads} />
            <Metric label="Hot leads" value={data.summary.metrics.hotThreads} />
            <Metric label="Inbound today" value={data.summary.metrics.inboundToday} />
            <Metric label="Outbound today" value={data.summary.metrics.outboundToday} />
            <Button className="w-full" variant="outline" onClick={draftSummary} disabled={pending}>
              <Wand2 className="mr-2 h-4 w-4" />
              Draft owner summary
            </Button>
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Lead Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm">
              <ContextLine icon={MessageCircle} label="Stage" value={selected.stage} />
              <ContextLine icon={UserRoundCheck} label="Owner" value={selected.assignedTo || 'Unassigned'} />
              <ContextLine icon={Clock} label="Last message" value={formatTime(selected.lastMessageAt)} />
              <ContextLine icon={Bot} label="AI mode" value={selected.aiMode} />
              {selected.status === 'pending_human' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <ShieldAlert className="mb-2 h-4 w-4" />
                  Human review suggested. Customer message contains urgent/confused/handoff language.
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {selected.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ThreadListItem({ thread, active }: { thread: WhatsAiThread; active: boolean }) {
  return (
    <Link
      href={`/conversations?phone=${encodeURIComponent(thread.phone)}`}
      className={cn(
        'block rounded-xl border p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50',
        active ? 'border-emerald-400 bg-emerald-50' : 'bg-background',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials(thread.contactName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">{thread.contactName}</div>
            <div className="text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</div>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{thread.lastBody}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {thread.temperature === 'hot' ? <Flame className="h-3.5 w-3.5 text-red-500" /> : null}
            <Badge variant="outline" className="text-[10px]">{thread.stage}</Badge>
            {thread.unreadCount ? <Badge variant="default" className="text-[10px]">{thread.unreadCount} unread</Badge> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
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
