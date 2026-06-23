'use client';

import { Calendar, Image as ImageIcon, Video, Film, Instagram, Facebook, Youtube, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, cn } from '@/lib/utils';
import type { ContentCalendarEntry } from '@/types/database';

const platformIcon = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube,
  google_ads: Sparkles, linkedin: Sparkles, twitter: Sparkles, whatsapp_status: Sparkles,
};

const typeIcon = {
  post: ImageIcon, story: ImageIcon, carousel: ImageIcon, ad_creative: ImageIcon,
  reel: Video, video: Video, long_form_video: Film,
};

export function ContentCard({ entry, onClick }: { entry: ContentCalendarEntry; onClick?: () => void }) {
  const PlatformIcon = platformIcon[entry.platform] ?? Sparkles;
  const TypeIcon     = typeIcon[entry.content_type] ?? ImageIcon;

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-md transition overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
        {entry.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <TypeIcon className="h-10 w-10 text-muted-foreground/50" />
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge kind={{ type: 'content_status', value: entry.status }} showHindi={false} />
        </div>
        <div className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-1 inline-flex items-center gap-1.5 text-xs">
          <PlatformIcon className="h-3 w-3" />
          {entry.content_type}
        </div>
      </div>

      <CardContent className="p-3">
        <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
          {entry.caption ?? '— No caption —'}
        </div>
        {entry.caption_hindi && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{entry.caption_hindi}</div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {entry.scheduled_for ? formatDate(entry.scheduled_for) : 'Unscheduled'}
          </span>
          {entry.virality_score != null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold',
                entry.virality_score >= 60 ? 'bg-emerald-50 text-emerald-700'
                  : entry.virality_score >= 40 ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700',
              )}
            >
              ★ {entry.virality_score}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
