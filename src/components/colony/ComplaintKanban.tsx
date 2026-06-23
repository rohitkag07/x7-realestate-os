'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatRelative, cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wrench } from 'lucide-react';
import { ComplaintActions } from '@/components/colony/ComplaintActions';
import type { Complaint, ComplaintStatus } from '@/types/database';

interface ComplaintKanbanProps {
  complaints: Complaint[];
}

const COLUMN_ORDER: ComplaintStatus[] = ['open', 'in_progress', 'resolved', 'reopened', 'closed'];
const COLUMN_TITLES: Record<ComplaintStatus, { en: string; hi: string }> = {
  open:        { en: 'Open',        hi: 'खुला' },
  in_progress: { en: 'In Progress', hi: 'चल रहा है' },
  resolved:    { en: 'Resolved',    hi: 'हल हुआ' },
  closed:      { en: 'Closed',      hi: 'बंद' },
  reopened:    { en: 'Reopened',    hi: 'फिर से खुला' },
};

export function ComplaintKanban({ complaints }: ComplaintKanbanProps) {
  if (complaints.length === 0) {
    return <EmptyState icon={Wrench} title="No complaints yet" description="A quiet colony is a happy colony." />;
  }

  const byStatus: Record<ComplaintStatus, Complaint[]> = {
    open: [], in_progress: [], resolved: [], closed: [], reopened: [],
  };
  for (const c of complaints) byStatus[c.status].push(c);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
      {COLUMN_ORDER.map((status) => {
        const items = byStatus[status];
        return (
          <div key={status} className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">{COLUMN_TITLES[status].en}</div>
                <div className="text-[10px] text-muted-foreground">{COLUMN_TITLES[status].hi}</div>
              </div>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-background px-2 text-xs font-semibold border">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <Card key={c.id} className={cn(
                  'p-3 border-l-4',
                  c.priority === 'critical' && 'border-l-red-600',
                  c.priority === 'high'     && 'border-l-amber-500',
                  c.priority === 'medium'   && 'border-l-blue-500',
                  c.priority === 'low'      && 'border-l-zinc-400',
                )}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold capitalize">{c.category}</span>
                    <StatusBadge kind={{ type: 'complaint_priority', value: c.priority }} showHindi={false} />
                  </div>
                  <div className="text-sm line-clamp-2">{c.description}</div>
                  <div className="mt-2 text-[10px] text-muted-foreground">{formatRelative(c.created_at)}</div>
                  <ComplaintActions id={c.id} current={c.status} />
                </Card>
              ))}
              {items.length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-6">No tickets</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
