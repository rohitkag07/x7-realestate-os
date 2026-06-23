'use client';

import { useMemo, useState, useTransition, type ComponentType } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flame, Filter, PhoneCall, Clock3 } from 'lucide-react';
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS } from '@/lib/constants';
import { LeadCard } from './LeadCard';
import { LeadModal } from './LeadModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Lead, LeadStage, LeadSource } from '@/types/database';
import { toast } from 'sonner';

interface LeadPipelineProps {
  leads: Lead[];
}

const ACTIVE_STAGE_ORDER: LeadStage[] = [...LEAD_STAGE_ORDER];

const sourceOptions: Array<{ key: 'all' | LeadSource; label: string }> = [
  { key: 'all', label: 'All sources' },
  { key: 'meta_ad', label: 'Meta' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'google_ad', label: 'Google' },
  { key: 'referral', label: 'Referral' },
  { key: 'ghost_closer', label: 'Ghost Closer' },
];

export function LeadPipeline({ leads }: LeadPipelineProps) {
  const [items, setItems] = useState(leads);
  const [open, setOpen] = useState<Lead | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | LeadSource>('all');
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [bulkOwner, setBulkOwner] = useState('Arjun Sales');
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    return items.filter((lead) => {
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
      if (showHotOnly && lead.temperature !== 'hot') return false;
      return true;
    });
  }, [items, showHotOnly, sourceFilter]);

  const byStage = useMemo(() => {
    const grouped: Record<LeadStage, Lead[]> = {
      new: [],
      qualified: [],
      visit_scheduled: [],
      visited: [],
      negotiation: [],
      booked: [],
      lost: [],
    };
    for (const lead of filtered) grouped[lead.lead_stage].push(lead);
    return grouped;
  }, [filtered]);

  const hotCount = filtered.filter((lead) => lead.temperature === 'hot').length;
  const dueFollowUps = filtered.filter((lead) => lead.lead_stage === 'new' || lead.lead_stage === 'qualified').length;
  const visitReady = filtered.filter((lead) => lead.lead_stage === 'visit_scheduled' || lead.lead_stage === 'visited').length;
  const lostLeads = byStage.lost;
  const filteredLeadIds = new Set(filtered.map((lead) => lead.id));

  function getStageForId(id: string): LeadStage | null {
    const lead = items.find((entry) => entry.id === id);
    if (lead) return lead.lead_stage;
    if (id.startsWith('stage:')) return id.replace('stage:', '') as LeadStage;
    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeStage = getStageForId(activeId);
    const nextStage = getStageForId(overId);

    if (!activeStage || !nextStage || activeStage === nextStage) return;

    setItems((current) => current.map((lead) => (
      lead.id === activeId
        ? {
            ...lead,
            lead_stage: nextStage,
            updated_at: new Date().toISOString(),
            last_contacted_at: nextStage === 'visit_scheduled' ? new Date().toISOString() : lead.last_contacted_at,
          }
        : lead
    )));
  }

  function assignFilteredLeads() {
    setItems((current) => current.map((lead) => (
      filteredLeadIds.has(lead.id)
        ? { ...lead, assigned_to: bulkOwner, updated_at: new Date().toISOString() }
        : lead
    )));
    toast.success(`${filtered.length} leads assigned to ${bulkOwner}.`);
  }

  function exportFilteredLeads() {
    const header = ['name', 'phone', 'source', 'stage', 'temperature', 'budget_range', 'assigned_to'];
    const rows = filtered.map((lead) => [
      lead.name,
      lead.phone,
      lead.source,
      lead.lead_stage,
      lead.temperature,
      lead.budget_range ?? '',
      lead.assigned_to ?? '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'x7-phase2-leads-export.csv';
    link.click();
    URL.revokeObjectURL(href);
    toast.success(`${filtered.length} leads exported.`);
  }

  function queueBulkFollowUps() {
    startTransition(async () => {
      try {
        await Promise.all(filtered.map(async (lead) => {
          const response = await fetch('/api/sales/follow-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: lead.id,
              builder_id: lead.builder_id,
              project_id: lead.project_id,
              lead_name: lead.name,
              lead_stage: lead.lead_stage,
              budget_range: lead.budget_range,
              purpose: lead.purpose,
              locale: 'hi-en',
              trigger: 'bulk-pipeline',
              phone: lead.phone,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error?.message || `Follow-up failed for ${lead.name}`);
          }
        }));
        toast.success(`Bulk follow-up queued for ${filtered.length} leads.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Bulk follow-up failed');
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PhoneCall}
        title="No leads yet"
        description="Turn on Meta ads, share the project WhatsApp link, or run the seed migration to load realistic sales data."
      />
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <SignalCard icon={Flame} title="Hot leads" value={hotCount} detail="Immediate follow-up worth chasing today" />
        <SignalCard icon={Clock3} title="Due follow-ups" value={dueFollowUps} detail="New + qualified leads needing same-day action" />
        <SignalCard icon={PhoneCall} title="Visit-ready" value={visitReady} detail="Leads that can move to on-ground conversion" />
      </section>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {sourceOptions.map((option) => (
            <Button
              key={option.key}
              size="sm"
              variant={sourceFilter === option.key ? 'default' : 'outline'}
              onClick={() => setSourceFilter(option.key)}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              {option.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showHotOnly ? 'success' : 'outline'}
            onClick={() => setShowHotOnly((current) => !current)}
          >
            <Flame className="h-3.5 w-3.5 mr-1.5" />
            Hot only
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Drag any lead card across the board to simulate stage movement, booking intent, and sales handoff.
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium">Bulk actions on current filter</div>
              <div className="text-xs text-muted-foreground">{filtered.length} leads currently in scope</div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={bulkOwner} onValueChange={setBulkOwner}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arjun Sales">Arjun Sales</SelectItem>
                  <SelectItem value="Ritika Closer">Ritika Closer</SelectItem>
                  <SelectItem value="Ghost Closer Desk">Ghost Closer Desk</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={assignFilteredLeads} disabled={!filtered.length}>
                Assign
              </Button>
              <Button size="sm" variant="outline" onClick={exportFilteredLeads} disabled={!filtered.length}>
                Export CSV
              </Button>
              <Button size="sm" onClick={queueBulkFollowUps} disabled={!filtered.length || pending}>
                Queue Follow-up
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-x-auto pb-2">
            {ACTIVE_STAGE_ORDER.map((stage) => (
              <LeadStageColumn
                key={stage}
                stage={stage}
                leads={byStage[stage]}
                onOpen={setOpen}
              />
            ))}
          </div>

          <Card className="bg-muted/20 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Lost / Dormant</div>
                  <div className="text-[11px] text-muted-foreground">Recovery candidates and lost reasons</div>
                </div>
                <Badge variant="outline">{lostLeads.length}</Badge>
              </div>
              <div className="space-y-2">
                {lostLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} compact onClick={setOpen} />
                ))}
                {lostLeads.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-8">No lost leads in current filter</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DndContext>

      <LeadModal lead={open} open={!!open} onClose={() => setOpen(null)} />
    </>
  );
}

function LeadStageColumn({
  stage,
  leads,
  onOpen,
}: {
  stage: LeadStage;
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}) {
  const meta = LEAD_STAGE_LABELS[stage];
  const stageId = `stage:${stage}`;

  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div ref={setNodeRef} className={cn('rounded-xl bg-muted/25 border border-border/60 p-3 min-w-[260px]', isOver && 'ring-2 ring-primary/30')}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide">{meta.en}</div>
          <div className="text-[10px] text-muted-foreground">{meta.hi}</div>
        </div>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-background px-2 text-xs font-semibold border">
          {leads.length}
        </span>
      </div>

      <SortableContext items={leads.map((lead) => lead.id)} strategy={rectSortingStrategy}>
        <div className="space-y-2 min-h-[140px]">
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onOpen={onOpen} />
          ))}
          {leads.length === 0 && (
            <div className="rounded-lg border border-dashed bg-background/70 px-3 py-6 text-center text-[11px] text-muted-foreground">
              Drop leads here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableLeadCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-65')}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} onClick={onOpen} />
    </div>
  );
}

function SignalCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}
