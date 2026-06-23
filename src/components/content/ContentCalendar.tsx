'use client';

import { ContentCard } from './ContentCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Image as ImageIcon } from 'lucide-react';
import type { ContentCalendarEntry } from '@/types/database';

interface ContentCalendarProps {
  entries: ContentCalendarEntry[];
}

/**
 * Week-grouped content calendar. Each card shows the post, scheduled
 * time, status, and Higgsfield virality score (if scored).
 */
export function ContentCalendar({ entries }: ContentCalendarProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Content calendar is empty"
        description="Ask the Content Agent to generate this month's calendar: 20 posts, 12 reels, 4 long-form videos."
      />
    );
  }

  // Group by week (YYYY-WW). Lightweight, no date-fns dependency for this view.
  const groups = new Map<string, ContentCalendarEntry[]>();
  for (const e of entries) {
    const key = e.scheduled_for ? weekKey(e.scheduled_for) : 'Unscheduled';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([week, items]) => (
        <section key={week}>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{week}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((entry) => <ContentCard key={entry.id} entry={entry} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unscheduled';
  const monday = new Date(d);
  const day = d.getDay() || 7;
  monday.setDate(d.getDate() - day + 1);
  return `Week of ${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}
