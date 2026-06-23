'use client';

import { FileImage, FileVideo, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  url?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: 'image' | 'video' | 'carousel' | 'gif' | null;
  className?: string;
}

/**
 * Universal media preview — used in content drafts, lead modals,
 * and ad campaign previews. Falls back to a typed placeholder.
 */
export function MediaPreview({ url, thumbnailUrl, mediaType, className }: MediaPreviewProps) {
  const display = thumbnailUrl ?? url;

  if (!display) {
    const Icon = mediaType === 'video' ? FileVideo : mediaType === 'image' ? FileImage : Sparkles;
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted/40 text-muted-foreground rounded-md border border-dashed aspect-video',
        className,
      )}>
        <Icon className="h-8 w-8" />
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <video
        src={url ?? undefined}
        poster={thumbnailUrl ?? undefined}
        controls
        className={cn('w-full rounded-md aspect-video bg-black object-cover', className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={display}
      alt="content preview"
      className={cn('w-full rounded-md aspect-video object-cover bg-muted', className)}
    />
  );
}
