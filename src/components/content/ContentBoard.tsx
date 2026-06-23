'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ContentCard } from '@/components/content/ContentCard';
import { MediaPreview } from '@/components/content/MediaPreview';
import { EmptyState } from '@/components/shared/EmptyState';
import { Image as ImageIcon } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { ContentCalendarEntry, ContentStatus } from '@/types/database';

const TABS: { value: string; label: string; filter: (e: ContentCalendarEntry) => boolean }[] = [
  { value: 'all',       label: 'All',             filter: () => true },
  { value: 'scheduled', label: 'Scheduled',       filter: (e) => e.status === 'scheduled' },
  { value: 'review',    label: 'Awaiting Review', filter: (e) => e.status === 'review' },
  { value: 'draft',     label: 'Drafts',          filter: (e) => e.status === 'draft' },
  { value: 'published', label: 'Published',       filter: (e) => e.status === 'published' },
];

export function ContentBoard({ entries }: { entries: ContentCalendarEntry[] }) {
  const [open, setOpen] = useState<ContentCalendarEntry | null>(null);

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} ({entries.filter(t.filter).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => {
          const filtered = entries.filter(t.filter);
          return (
            <TabsContent key={t.value} value={t.value}>
              {filtered.length === 0 ? (
                <EmptyState icon={ImageIcon} title="Nothing here yet" description="Generate a calendar or wait for the content agent to render drafts." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((e) => <ContentCard key={e.id} entry={e} onClick={() => setOpen(e)} />)}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <ContentDetailDialog entry={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}

function ContentDetailDialog({
  entry, open, onOpenChange,
}: { entry: ContentCalendarEntry | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!entry) return null;

  function act(path: string, successMsg: string) {
    start(async () => {
      try {
        const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? res.statusText);
        toast.success(successMsg);
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="capitalize">{entry.content_type.replace('_', ' ')}</DialogTitle>
              <DialogDescription>{entry.pillar?.replace(/_/g, ' ')} · {formatDate(entry.scheduled_for)}</DialogDescription>
            </div>
            <StatusBadge kind={{ type: 'content_status', value: entry.status }} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <MediaPreview url={entry.media_url} thumbnailUrl={entry.thumbnail_url} mediaType={entry.media_type ?? null} />
          {entry.virality_score != null && (
            <div className={cn('flex items-center justify-between rounded-md border px-4 py-2 text-sm',
              entry.virality_score >= 60 ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : entry.virality_score >= 40 ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800')}>
              <span className="font-medium">Virality Score</span>
              <span className="font-bold text-base">★ {entry.virality_score}/100</span>
            </div>
          )}
          {entry.caption_hindi && <Textarea readOnly value={entry.caption_hindi} rows={2} />}
          {entry.caption && <Textarea readOnly value={entry.caption} rows={2} />}
          {entry.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">{entry.hashtags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>)}</div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => act(`/api/content/${entry.id}/regenerate`, 'Regeneration queued')}>
            <RefreshCw className={cn('h-4 w-4 mr-2', pending && 'animate-spin')} /> Regenerate
          </Button>
          {entry.media_url && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => act(`/api/content/${entry.id}/score`, 'Virality check started')}>
              <Sparkles className="h-4 w-4 mr-2" /> Re-score
            </Button>
          )}
          {(entry.status === 'review' || entry.status === 'approved') && (
            <Button size="sm" disabled={pending} onClick={() => act(`/api/content/${entry.id}/approve`, 'Approved & scheduled')}>
              <Check className="h-4 w-4 mr-2" /> Approve & Schedule
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
