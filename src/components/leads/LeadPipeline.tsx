'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Flame, GripVertical, MessageCircle, Phone, ThermometerSun } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn, formatPhone } from '@/lib/utils';
import type { WhatsAiThread } from '@/lib/whatsai-data';
import type { ConversationStage } from '@/types/database';

interface LeadPipelineProps {
  threads: WhatsAiThread[];
}

const STAGES: Array<{ value: ConversationStage; label: string; tone: string }> = [
  { value: 'new', label: 'New', tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  { value: 'interested', label: 'Interested', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { value: 'negotiating', label: 'Negotiating', tone: 'border-orange-200 bg-orange-50 text-orange-800' },
  { value: 'booked', label: 'Booked', tone: 'border-purple-200 bg-purple-50 text-purple-800' },
  { value: 'lost', label: 'Lost', tone: 'border-red-200 bg-red-50 text-red-800' },
  { value: 'cold', label: 'Cold', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
];

export function LeadPipeline({ threads }: LeadPipelineProps) {
  const [items, setItems] = useState(threads);
  const [pending, startTransition] = useTransition();

  const byStage = useMemo(() => {
    const grouped = Object.fromEntries(STAGES.map(({ value }) => [value, [] as WhatsAiThread[]])) as Record<ConversationStage, WhatsAiThread[]>;
    for (const thread of items) grouped[thread.stage].push(thread);
    return grouped;
  }, [items]);

  function handleDragEnd(event: DropResult) {
    if (!event.destination) return;
    const activeId = event.draggableId;
    const nextStage = event.destination.droppableId as ConversationStage;
    const current = items.find((thread) => thread.id === activeId);
    if (!current || !nextStage || current.stage === nextStage) return;
    persistStage(current, nextStage);
  }

  function persistStage(thread: WhatsAiThread, stage: ConversationStage) {
    if (!thread.contactId || !thread.businessId) {
      toast.error('This lead is missing its canonical contact or business scope.');
      return;
    }

    const previous = thread.stage;
    setItems((current) => current.map((item) => item.id === thread.id ? { ...item, stage } : item));
    startTransition(async () => {
      try {
        const response = await fetch(`/api/leads/${thread.contactId}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: thread.businessId, stage }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Stage update failed.');
        toast.success(`${thread.contactName} moved to ${stage}.`);
      } catch (error) {
        setItems((current) => current.map((item) => item.id === thread.id ? { ...item, stage: previous } : item));
        toast.error(error instanceof Error ? error.message : 'Stage update failed.');
      }
    });
  }

  if (!items.length) return <EmptyState icon={MessageCircle} title="No WhatsApp leads yet" description="New conversations appear here as soon as a customer messages your business number." />;

  return <>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Signal label="Hot leads" value={items.filter((thread) => thread.temperature === 'hot').length} icon={Flame} />
      <Signal label="Need attention" value={items.filter((thread) => thread.aiMode === 'manual' || thread.aiMode === 'paused').length} icon={ThermometerSun} />
      <Signal label="Booked" value={byStage.booked.length} icon={MessageCircle} />
    </div>
    <p className="mb-3 text-sm text-muted-foreground">Drag a card to update its stage. Every move is saved to the WhatsAI contact and conversation thread.</p>
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {STAGES.map((stage) => <StageColumn key={stage.value} stage={stage} threads={byStage[stage.value]} pending={pending} />)}
      </div>
    </DragDropContext>
  </>;
}

function StageColumn({ stage, threads, pending }: { stage: typeof STAGES[number]; threads: WhatsAiThread[]; pending: boolean }) {
  return <Droppable droppableId={stage.value} isDropDisabled={pending}>{(provided, snapshot) => <section ref={provided.innerRef} {...provided.droppableProps} className={cn('min-h-[235px] rounded-2xl border p-3 transition', stage.tone, snapshot.isDraggingOver && 'ring-2 ring-[#00a884] ring-offset-2')}>
    <header className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">{stage.label} ({threads.length})</h2><Badge variant="outline" className="bg-white/70">{threads.length}</Badge></header>
    <div className="space-y-2">{threads.map((thread, index) => <PipelineCard key={thread.id} thread={thread} index={index} disabled={pending} />)}{provided.placeholder}</div>
    {!threads.length && <div className="mt-10 rounded-xl border border-dashed border-current/20 bg-white/40 px-3 py-7 text-center text-xs opacity-70">Drop leads here</div>}
  </section>}</Droppable>;
}

function PipelineCard({ thread, index, disabled }: { thread: WhatsAiThread; index: number; disabled: boolean }) {
  return <Draggable draggableId={thread.id} index={index} isDragDisabled={disabled}>{(provided, snapshot) => <Link ref={provided.innerRef} href={`/chats?phone=${encodeURIComponent(thread.phone)}`} {...provided.draggableProps} className={cn('block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#00a884] hover:shadow-md', snapshot.isDragging && 'rotate-1 opacity-80 shadow-lg')}>
    <div className="flex gap-2"><button type="button" aria-label="Drag lead" className="mt-0.5 cursor-grab text-slate-400 active:cursor-grabbing" onClick={(event) => event.preventDefault()} {...provided.dragHandleProps}><GripVertical className="h-4 w-4" /></button><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="truncate text-sm font-semibold text-slate-950">{thread.contactName}</div>{thread.temperature === 'hot' && <Flame className="h-4 w-4 shrink-0 text-red-500" />}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{formatPhone(thread.phone)}</div><div className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{thread.lastBody}</div><div className="mt-3 flex items-center justify-between gap-2"><Badge variant={thread.temperature === 'hot' ? 'destructive' : thread.temperature === 'warm' ? 'warning' : 'secondary'} className="text-[10px]">{thread.temperature}</Badge><span className="text-[10px] text-slate-400">{formatRelativeTime(thread.lastMessageAt)}</span></div></div></div>
  </Link>}</Draggable>;
}

function Signal({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Flame }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className="rounded-xl bg-[#d9fdd3] p-2 text-[#075e54]"><Icon className="h-4 w-4" /></span><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold text-slate-950">{value}</div></div></CardContent></Card>;
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1_440)}d`;
}
