import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Handshake, NotebookPen, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Conversations — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

type LeadStatus = 'hot' | 'warm' | 'cold' | 'new';
type MessageRole = 'customer' | 'assistant';
type ContactRow = {
  id: string; threadId: string; name: string; phone: string; lastMsg: string; time: string;
  status: LeadStatus; vertical: string; messages: MessageRow[]; answers: Record<string, string>;
};
type MessageRow = { id: string; role: MessageRole; content: string; time: string };
type DbThread = {
  id: string; temperature: string; updated_at: string;
  conversation_contacts: { id: string; name: string | null; phone: string } | { id: string; name: string | null; phone: string }[] | null;
  assistant_playbooks: { vertical: string } | { vertical: string }[] | null;
};
type DbMessage = { id: string; thread_id: string; role: string; direction: string; content: string | null; created_at: string };
type DbAnswer = { thread_id: string; question_key: string; answer_value: string };

const DEMO_CONTACTS: ContactRow[] = [
  {
    id: '1', threadId: 'demo-1', name: 'Aditya Sharma', phone: '+91 98765 43210',
    lastMsg: 'Mujhe 2BHK chahiye Super Corridor mein', time: '10:32 AM', status: 'hot', vertical: 'Real Estate',
    messages: [
      { id: 'm1', role: 'customer', content: 'Mujhe 2BHK chahiye Super Corridor mein', time: '10:29 AM' },
      { id: 'm2', role: 'assistant', content: 'Bilkul. Aapka budget range aur visit timeline kya hai?', time: '10:29 AM' },
      { id: 'm3', role: 'customer', content: 'Budget 40L tak hai. Is weekend visit kar sakta hoon.', time: '10:32 AM' },
    ],
    answers: { Need: '2BHK in Super Corridor', Budget: 'Up to 40L', Timeline: 'This weekend', Intent: 'Site visit' },
  },
  {
    id: '2', threadId: 'demo-2', name: 'Dr. Meena Joshi', phone: '+91 87654 32109',
    lastMsg: 'Saturday morning slot available hai?', time: '10:45 AM', status: 'warm', vertical: 'Clinic',
    messages: [
      { id: 'm4', role: 'customer', content: 'Saturday morning slot available hai?', time: '10:43 AM' },
      { id: 'm5', role: 'assistant', content: 'Saturday 10:30 AM available hai. Kya main appointment confirm kar doon?', time: '10:44 AM' },
      { id: 'm6', role: 'customer', content: 'Haan confirm kar dijiye.', time: '10:45 AM' },
    ],
    answers: { Need: 'Clinic consultation', PreferredSlot: 'Saturday morning', Status: 'Appointment requested' },
  },
  {
    id: '3', threadId: 'demo-3', name: 'Rohit Verma', phone: '+91 76543 21098',
    lastMsg: 'Coaching fee enquiry — Step 3/5', time: '11:02 AM', status: 'new', vertical: 'Coaching',
    messages: [
      { id: 'm7', role: 'customer', content: 'Class 11 PCM coaching fees kya hai?', time: '10:59 AM' },
      { id: 'm8', role: 'assistant', content: 'Main details share karta hoon. Student ka board aur preferred batch timing kya hai?', time: '11:00 AM' },
    ],
    answers: { Course: 'Class 11 PCM', Stage: 'Qualification Step 3/5' },
  },
];

async function loadConversations(): Promise<ContactRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return DEMO_CONTACTS;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data: threads, error } = await sb
      .from('conversation_threads')
      .select('id, temperature, updated_at, conversation_contacts(id, name, phone), assistant_playbooks(vertical)')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error || !threads?.length) return DEMO_CONTACTS;

    const threadIds = threads.map((thread) => thread.id);
    const [{ data: messages }, { data: answers }] = await Promise.all([
      sb.from('conversation_messages').select('id, thread_id, role, direction, content, created_at').in('thread_id', threadIds).order('created_at', { ascending: true }),
      sb.from('lead_qualification_answers').select('thread_id, question_key, answer_value').in('thread_id', threadIds),
    ]);
    return mapDbRows((threads as unknown as DbThread[]) ?? [], (messages as DbMessage[]) ?? [], (answers as DbAnswer[]) ?? []);
  } catch {
    return DEMO_CONTACTS;
  }
}

function mapDbRows(threads: DbThread[], messages: DbMessage[], answers: DbAnswer[]): ContactRow[] {
  return threads.map((thread) => {
    const contact = firstOrNull(thread.conversation_contacts);
    const playbook = firstOrNull(thread.assistant_playbooks);
    const threadMessages = messages.filter((message) => message.thread_id === thread.id).map(toMessageRow);
    const last = threadMessages.at(-1);
    return {
      id: contact?.id ?? thread.id,
      threadId: thread.id,
      name: contact?.name ?? 'Unknown Contact',
      phone: contact?.phone ?? '—',
      lastMsg: last?.content ?? 'No messages yet',
      time: last?.time ?? formatTime(thread.updated_at),
      status: normalizeStatus(thread.temperature),
      vertical: toTitle(playbook?.vertical ?? 'custom'),
      messages: threadMessages.length ? threadMessages : [{ id: `${thread.id}-empty`, role: 'assistant', content: 'Conversation has started. Waiting for the first saved message.', time: formatTime(thread.updated_at) }],
      answers: Object.fromEntries(answers.filter((answer) => answer.thread_id === thread.id).map((answer) => [toTitle(answer.question_key), answer.answer_value])),
    };
  });
}

export default async function ConversationsPage({ searchParams }: { searchParams?: { q?: string; thread?: string } }) {
  const query = searchParams?.q?.trim().toLowerCase() ?? '';
  const contacts = (await loadConversations()).filter((contact) =>
    !query || `${contact.name} ${contact.phone} ${contact.lastMsg}`.toLowerCase().includes(query),
  );
  const selected = contacts.find((contact) => contact.threadId === searchParams?.thread) ?? contacts[0] ?? DEMO_CONTACTS[0];

  return (
    <>
      <PageHeader title="Conversations" titleHi="बातचीत" description="WhatsApp chats, qualification answers, and owner handoff controls in one workspace." />
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ContactList contacts={contacts} selectedId={selected.threadId} query={searchParams?.q ?? ''} />
        <ThreadView contact={selected} />
      </div>
    </>
  );
}

function ContactList({ contacts, selectedId, query }: { contacts: ContactRow[]; selectedId: string; query: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-3">
        <form className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Search WhatsApp contacts..." className="pl-9" />
        </form>
      </CardHeader>
      <CardContent className="max-h-[680px] overflow-y-auto p-0">
        {contacts.map((contact) => <ContactItem key={contact.threadId} contact={contact} selected={contact.threadId === selectedId} />)}
      </CardContent>
    </Card>
  );
}

function ContactItem({ contact, selected }: { contact: ContactRow; selected: boolean }) {
  return (
    <Link href={`/conversations?thread=${contact.threadId}`} className={cn('flex gap-3 border-b p-4 transition-colors hover:bg-muted/40', selected && 'bg-primary/5')}>
      <Avatar><AvatarFallback>{initials(contact.name)}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{contact.name}</p><p className="text-xs text-muted-foreground">{contact.phone}</p></div>
          <span className="text-[11px] text-muted-foreground">{contact.time}</span>
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">{contact.lastMsg}</p>
        <Badge className={cn('mt-2 border-0 capitalize', statusColor(contact.status))}>{contact.status}</Badge>
      </div>
    </Link>
  );
}

function ThreadView({ contact }: { contact: ContactRow }) {
  return (
    <Card className="min-h-[680px]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-lg">{contact.name}</CardTitle><p className="text-sm text-muted-foreground">{contact.phone}</p></div>
          <Badge variant="outline">{contact.vertical}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <div className="space-y-3">
          {contact.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        </div>
        <QualificationCard answers={contact.answers} />
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button><Handshake className="mr-2 h-4 w-4" /> Mark Handoff</Button>
          <Button variant="outline"><NotebookPen className="mr-2 h-4 w-4" /> Add Note</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isAi = message.role === 'assistant';
  return (
    <div className={cn('flex', isAi ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[78%] rounded-lg px-4 py-3 text-sm', isAi ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        <p>{message.content}</p>
        <p className={cn('mt-1 text-[10px]', isAi ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{message.time}</p>
      </div>
    </div>
  );
}

function QualificationCard({ answers }: { answers: Record<string, string> }) {
  const entries = Object.entries(answers);
  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3"><CardTitle className="text-base">Qualification Answers</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {entries.length ? entries.map(([key, value]) => <div key={key}><p className="text-xs text-muted-foreground">{key}</p><p className="text-sm font-medium">{value}</p></div>) : (
          <p className="text-sm text-muted-foreground">No qualification answers captured yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function toMessageRow(message: DbMessage): MessageRow {
  return { id: message.id, role: message.role === 'assistant' ? 'assistant' : 'customer', content: message.content ?? '[media message]', time: formatTime(message.created_at) };
}
function firstOrNull<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
function normalizeStatus(value: string): LeadStatus {
  return value === 'hot' || value === 'warm' || value === 'cold' ? value : 'new';
}
function statusColor(status: LeadStatus) {
  return { hot: 'bg-red-100 text-red-800', warm: 'bg-amber-100 text-amber-800', cold: 'bg-blue-100 text-blue-800', new: 'bg-zinc-100 text-zinc-700' }[status];
}
function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}
function toTitle(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
