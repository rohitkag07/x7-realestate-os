import { createClient } from '@supabase/supabase-js';
import { CalendarCheck, Download, Filter, MessageCircle, Phone } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Qualified Leads' };
export const dynamic = 'force-dynamic';

type LeadStatus = 'hot' | 'warm' | 'cold' | 'new';
type NextAction = 'Handoff' | 'Follow-up' | 'Appointment';
type QualifiedLead = {
  id: string; name: string; phone: string; vertical: string; need: string; budgetUrgency: string;
  hasAppointmentRequest: boolean; aiSummary: string; qualificationScore: string; status: LeadStatus; nextAction: NextAction;
};
type DbThread = {
  id: string; temperature: string; updated_at: string;
  conversation_contacts: { name: string | null; phone: string } | { name: string | null; phone: string }[] | null;
  assistant_playbooks: { vertical: string; qualification_questions: unknown } | { vertical: string; qualification_questions: unknown }[] | null;
};
type DbAnswer = { thread_id: string; question_key: string; answer_value: string };
type DbMessage = { thread_id: string; role: string; direction: string; content: string | null; created_at: string };

const DEMO_LEADS: QualifiedLead[] = [
  {
    id: 'demo-1', name: 'Aditya Sharma', phone: '+91 98765 43210', vertical: 'Real Estate',
    need: '2BHK near Super Corridor', budgetUrgency: 'Budget up to 40L · this weekend',
    hasAppointmentRequest: true, aiSummary: 'AI qualified budget and site-visit intent. Owner should confirm slot.',
    qualificationScore: '4/5', status: 'hot', nextAction: 'Handoff',
  },
  {
    id: 'demo-2', name: 'Dr. Meena Joshi', phone: '+91 87654 32109', vertical: 'Clinic',
    need: 'Consultation slot', budgetUrgency: 'Urgent · Saturday morning',
    hasAppointmentRequest: true, aiSummary: 'Appointment requested for Saturday. Confirm availability with owner.',
    qualificationScore: '3/4', status: 'warm', nextAction: 'Appointment',
  },
  {
    id: 'demo-3', name: 'Rohit Verma', phone: '+91 76543 21098', vertical: 'Coaching',
    need: 'Class 11 PCM fee details', budgetUrgency: 'Comparing batches this week',
    hasAppointmentRequest: false, aiSummary: 'AI asked board and timing. Needs one more follow-up.',
    qualificationScore: '2/5', status: 'new', nextAction: 'Follow-up',
  },
];

async function loadQualifiedLeads(): Promise<QualifiedLead[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return DEMO_LEADS;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data: threads, error } = await sb
      .from('conversation_threads')
      .select('id, temperature, updated_at, conversation_contacts(name, phone), assistant_playbooks(vertical, qualification_questions)')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error || !threads?.length) return DEMO_LEADS;

    const ids = threads.map((thread) => thread.id);
    const [{ data: answers }, { data: messages }] = await Promise.all([
      sb.from('lead_qualification_answers').select('thread_id, question_key, answer_value').in('thread_id', ids),
      sb.from('conversation_messages').select('thread_id, role, direction, content, created_at').in('thread_id', ids).order('created_at', { ascending: true }),
    ]);

    return mapThreads((threads as unknown as DbThread[]) ?? [], (answers as DbAnswer[]) ?? [], (messages as DbMessage[]) ?? []);
  } catch {
    return DEMO_LEADS;
  }
}

function mapThreads(threads: DbThread[], answers: DbAnswer[], messages: DbMessage[]): QualifiedLead[] {
  return threads.map((thread) => {
    const contact = firstOrNull(thread.conversation_contacts);
    const playbook = firstOrNull(thread.assistant_playbooks);
    const threadAnswers = answers.filter((answer) => answer.thread_id === thread.id);
    const answerMap = Object.fromEntries(threadAnswers.map((answer) => [answer.question_key.toLowerCase(), answer.answer_value]));
    const aiSummary = messages.filter((message) => message.thread_id === thread.id && message.role === 'assistant').at(-1)?.content;
    const totalQuestions = Array.isArray(playbook?.qualification_questions) ? playbook.qualification_questions.length : Math.max(5, threadAnswers.length);
    const hasAppointmentRequest = hasAppointment(answerMap, messages.filter((message) => message.thread_id === thread.id));

    return {
      id: thread.id,
      name: contact?.name ?? 'Unknown Contact',
      phone: contact?.phone ?? '—',
      vertical: toTitle(playbook?.vertical ?? 'custom'),
      need: answerMap.need ?? answerMap.requirement ?? answerMap.service ?? threadAnswers[0]?.answer_value ?? 'Need not captured yet',
      budgetUrgency: [answerMap.budget, answerMap.urgency ?? answerMap.timeline].filter(Boolean).join(' · ') || 'Not captured yet',
      hasAppointmentRequest,
      aiSummary: aiSummary ?? 'AI has not generated a summary yet.',
      qualificationScore: `${threadAnswers.length}/${totalQuestions || threadAnswers.length || 1}`,
      status: normalizeStatus(thread.temperature),
      nextAction: nextAction(normalizeStatus(thread.temperature), hasAppointmentRequest),
    };
  });
}

export default async function LeadsPage({ searchParams }: { searchParams?: { vertical?: string; status?: string } }) {
  const leads = await loadQualifiedLeads();
  const vertical = searchParams?.vertical ?? 'all';
  const status = searchParams?.status ?? 'all';
  const verticals = Array.from(new Set(leads.map((lead) => lead.vertical)));
  const filtered = leads.filter((lead) =>
    (vertical === 'all' || lead.vertical === vertical) && (status === 'all' || lead.status === status),
  );

  return (
    <>
      <PageHeader
        title="Qualified Leads"
        titleHi="क्वालिफाइड लीड्स"
        description="WhatsApp conversations converted into clear SMB lead cards: need, urgency, score, and next action."
        actions={<Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>}
      />
      <FilterBar verticals={verticals} vertical={vertical} status={status} />
      <DesktopTable leads={filtered} />
      <MobileCards leads={filtered} />
    </>
  );
}

function FilterBar({ verticals, vertical, status }: { verticals: string[]; vertical: string; status: string }) {
  return (
    <form className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" /> Filter leads</div>
      <Select name="vertical" defaultValue={vertical}>
        <SelectTrigger className="sm:w-[210px]"><SelectValue placeholder="Vertical" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All verticals</SelectItem>
          {verticals.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select name="status" defaultValue={status}>
        <SelectTrigger className="sm:w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {['all', 'hot', 'warm', 'cold', 'new'].map((item) => <SelectItem key={item} value={item}>{toTitle(item)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm">Apply</Button>
    </form>
  );
}

function DesktopTable({ leads }: { leads: QualifiedLead[] }) {
  return (
    <Card className="hidden overflow-hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            {['Lead', 'Vertical', 'Need / Problem', 'Budget / Urgency', 'Intent', 'AI Summary', 'Score', 'Status', 'Next'].map((head) => (
              <TableHead key={head}>{head}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => <LeadTableRow key={lead.id} lead={lead} />)}
        </TableBody>
      </Table>
    </Card>
  );
}

function LeadTableRow({ lead }: { lead: QualifiedLead }) {
  return (
    <TableRow>
      <TableCell><p className="font-medium">{lead.name}</p><p className="text-xs text-muted-foreground">{lead.phone}</p></TableCell>
      <TableCell><Badge variant="outline">{lead.vertical}</Badge></TableCell>
      <TableCell className="max-w-[180px] text-sm text-muted-foreground">{lead.need}</TableCell>
      <TableCell className="max-w-[170px] text-sm text-muted-foreground">{lead.budgetUrgency}</TableCell>
      <TableCell>{lead.hasAppointmentRequest ? <Badge variant="success">Requested</Badge> : <Badge variant="outline">Not yet</Badge>}</TableCell>
      <TableCell className="max-w-[240px] text-xs text-muted-foreground">{lead.aiSummary}</TableCell>
      <TableCell className="font-medium">{lead.qualificationScore}</TableCell>
      <TableCell><Badge className={cn('border-0 capitalize', statusColor(lead.status))}>{lead.status}</Badge></TableCell>
      <TableCell><ActionBadge action={lead.nextAction} /></TableCell>
    </TableRow>
  );
}

function MobileCards({ leads }: { leads: QualifiedLead[] }) {
  return (
    <div className="grid gap-3 lg:hidden">
      {leads.map((lead) => (
        <Card key={lead.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle className="text-base">{lead.name}</CardTitle><p className="text-xs text-muted-foreground">{lead.phone}</p></div>
              <Badge className={cn('border-0 capitalize', statusColor(lead.status))}>{lead.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{lead.vertical}</Badge><ActionBadge action={lead.nextAction} /></div>
            <Info label="Need" value={lead.need} />
            <Info label="Budget / urgency" value={lead.budgetUrgency} />
            <Info label="AI summary" value={lead.aiSummary} />
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">Qualification score</span>
              <span className="font-semibold">{lead.qualificationScore}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionBadge({ action }: { action: NextAction }) {
  const Icon = action === 'Appointment' ? CalendarCheck : action === 'Handoff' ? Phone : MessageCircle;
  return <Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" /> {action}</Badge>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
function firstOrNull<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
function normalizeStatus(value: string): LeadStatus {
  return value === 'hot' || value === 'warm' || value === 'cold' ? value : 'new';
}
function nextAction(status: LeadStatus, hasAppointment: boolean): NextAction {
  if (status === 'hot') return 'Handoff';
  if (hasAppointment) return 'Appointment';
  return 'Follow-up';
}
function hasAppointment(answerMap: Record<string, string>, messages: DbMessage[]) {
  const haystack = `${Object.values(answerMap).join(' ')} ${messages.map((message) => message.content ?? '').join(' ')}`.toLowerCase();
  return /appointment|slot|visit|demo|callback|consultation|saturday|tomorrow/.test(haystack);
}
function statusColor(status: LeadStatus) {
  return { hot: 'bg-red-100 text-red-800', warm: 'bg-amber-100 text-amber-800', cold: 'bg-blue-100 text-blue-800', new: 'bg-zinc-100 text-zinc-700' }[status];
}
function toTitle(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
