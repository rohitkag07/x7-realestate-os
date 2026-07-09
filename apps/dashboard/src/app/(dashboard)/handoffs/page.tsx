import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, Clock3, Handshake } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Handoffs — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

type HandoffStatus = 'new' | 'acknowledged' | 'done';
type HandoffReason = 'hot_lead' | 'payment_intent' | 'appointment_request' | 'human_requested' | 'urgent_callback' | 'complaint';
type HandoffRow = {
  id: string; threadId: string; name: string; phone: string; reason: HandoffReason;
  aiSummary: string; suggestedAction: string; status: HandoffStatus; createdAt: string;
};
type DbHandoff = {
  id: string; thread_id: string; reason: string; status: string; summary?: string | null;
  ai_summary?: string | null; suggested_action?: string | null; created_at: string;
  conversation_threads?: { conversation_contacts?: { name: string | null; phone: string } | { name: string | null; phone: string }[] | null } | null;
  conversation_contacts?: { name: string | null; phone: string } | { name: string | null; phone: string }[] | null;
};

const DEMO_HANDOFFS: HandoffRow[] = [
  {
    id: 'demo-h1', threadId: 'demo-1', name: 'Aditya Sharma', phone: '+91 98765 43210',
    reason: 'hot_lead', aiSummary: 'Budget confirmed up to 40L. Customer wants a weekend visit.',
    suggestedAction: 'Call within 10 minutes and lock a Saturday slot.', status: 'new', createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: 'demo-h2', threadId: 'demo-2', name: 'Dr. Meena Joshi', phone: '+91 87654 32109',
    reason: 'appointment_request', aiSummary: 'Customer asked for Saturday morning clinic appointment.',
    suggestedAction: 'Confirm 10:30 AM slot and send location.', status: 'acknowledged', createdAt: new Date(Date.now() - 47 * 60_000).toISOString(),
  },
  {
    id: 'demo-h3', threadId: 'demo-3', name: 'Rohit Verma', phone: '+91 76543 21098',
    reason: 'human_requested', aiSummary: 'Customer wants to speak with a counselor before choosing batch.',
    suggestedAction: 'Assign counselor and follow up on WhatsApp.', status: 'done', createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
];

async function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function updateHandoffStatus(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as HandoffStatus;
  if (!id || !['new', 'acknowledged', 'done'].includes(status)) return;
  const sb = await getServiceClient();
  if (!sb) return;
  const { error } = await sb.from('handoff_events').update({ status }).eq('id', id);
  if (error) {
    const legacyStatus = status === 'new' ? 'pending' : status === 'done' ? 'resolved' : status;
    await sb.from('handoff_events').update({ status: legacyStatus }).eq('id', id);
  }
  revalidatePath('/handoffs');
}

async function loadHandoffs(): Promise<HandoffRow[]> {
  const sb = await getServiceClient();
  if (!sb) return DEMO_HANDOFFS;

    const { data, error } = await sb
    .from('handoff_events')
    .select('*, conversation_threads(conversation_contacts(name, phone))')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data?.length) return DEMO_HANDOFFS;
  return (data as unknown as DbHandoff[]).map(toHandoffRow);
}

function toHandoffRow(row: DbHandoff): HandoffRow {
  const threadContact = firstOrNull(row.conversation_threads?.conversation_contacts ?? null);
  const directContact = firstOrNull(row.conversation_contacts ?? null);
  const contact = directContact ?? threadContact;
  return {
    id: row.id,
    threadId: row.thread_id,
    name: contact?.name ?? 'Unknown Contact',
    phone: contact?.phone ?? '—',
    reason: normalizeReason(row.reason),
    aiSummary: row.ai_summary ?? row.summary ?? 'AI summary not captured yet.',
    suggestedAction: row.suggested_action ?? suggestedActionFor(row.reason),
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
  };
}

export default async function HandoffsPage({ searchParams }: { searchParams?: { status?: string } }) {
  const handoffs = await loadHandoffs();
  const status = searchParams?.status ?? 'all';
  const filtered = handoffs.filter((handoff) => status === 'all' || handoff.status === status);
  const newCount = handoffs.filter((handoff) => handoff.status === 'new').length;

  return (
    <>
      <PageHeader
        title="Handoffs"
        titleHi="हैंडऑफ"
        description="Owner-ready WhatsApp leads that need a human decision, callback, payment nudge, or appointment confirmation."
      />
      <StatusFilter status={status} newCount={newCount} />
      <div className="grid gap-4">
        {filtered.map((handoff) => <HandoffCard key={handoff.id} handoff={handoff} />)}
      </div>
    </>
  );
}

function StatusFilter({ status, newCount }: { status: string; newCount: number }) {
  const options: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'new', label: `New (${newCount})` },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'done', label: 'Done' },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <Button key={option.value} asChild size="sm" variant={status === option.value ? 'default' : 'outline'}>
          <Link href={option.value === 'all' ? '/handoffs' : `/handoffs?status=${option.value}`}>{option.label}</Link>
        </Button>
      ))}
    </div>
  );
}

function HandoffCard({ handoff }: { handoff: HandoffRow }) {
  return (
    <Card className={cn(handoff.status === 'new' && 'border-red-200 bg-red-50/30 shadow-sm')}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{handoff.name}</CardTitle>
              <ReasonBadge reason={handoff.reason} />
              {handoff.status === 'new' && <Badge variant="destructive">New</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{handoff.phone}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> {timeAgo(handoff.createdAt)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <InfoBlock label="AI summary" value={handoff.aiSummary} />
          <InfoBlock label="Suggested owner action" value={handoff.suggestedAction} strong />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/conversations?thread=${handoff.threadId}`}>Open conversation <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <StatusForm handoff={handoff} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusForm({ handoff }: { handoff: HandoffRow }) {
  return (
    <form action={updateHandoffStatus} className="space-y-2">
      <input type="hidden" name="id" value={handoff.id} />
      <label className="text-xs font-medium text-muted-foreground" htmlFor={`status-${handoff.id}`}>Status</label>
      <select id={`status-${handoff.id}`} name="status" defaultValue={handoff.status} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
        <option value="new">New</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="done">Done</option>
      </select>
      <Button type="submit" size="sm" className="w-full">Update status</Button>
    </form>
  );
}

function ReasonBadge({ reason }: { reason: HandoffReason }) {
  return <Badge className={cn('border-0 capitalize', reasonColor(reason))}>{reason.replace(/_/g, ' ')}</Badge>;
}
function InfoBlock({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn('mt-1 text-sm leading-6', strong && 'font-medium')}>{value}</p></div>;
}
function firstOrNull<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
function normalizeStatus(status: string): HandoffStatus {
  if (status === 'acknowledged') return 'acknowledged';
  if (status === 'done' || status === 'resolved') return 'done';
  return 'new';
}
function normalizeReason(reason: string): HandoffReason {
  const allowed = ['hot_lead', 'payment_intent', 'appointment_request', 'human_requested', 'urgent_callback', 'complaint'];
  return allowed.includes(reason) ? reason as HandoffReason : 'hot_lead';
}
function reasonColor(reason: HandoffReason) {
  if (reason === 'urgent_callback' || reason === 'human_requested' || reason === 'complaint') return 'bg-red-100 text-red-800';
  if (reason === 'payment_intent' || reason === 'hot_lead') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}
function suggestedActionFor(reason: string) {
  return ({
    hot_lead: 'Call the lead and move them to the next decision step.',
    payment_intent: 'Send payment details and confirm once paid.',
    appointment_request: 'Confirm the requested appointment slot.',
    human_requested: 'Assign a human owner for follow-up.',
    urgent_callback: 'Call immediately.',
    complaint: 'Acknowledge the issue and assign the right team.',
  } as Record<string, string>)[reason] ?? 'Review the conversation and decide the next owner action.';
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
