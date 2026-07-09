import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { serviceClientOrNull } from '@/lib/content-server';
import { demoContent, contentStats } from '@/lib/content-data';
import type { ContentCalendarEntry } from '@/types/database';

export type ContentReadSource = 'supabase' | 'demo';

export function contentReadSourceLabel(source: ContentReadSource) {
  return source === 'supabase'
    ? 'Live Supabase records loaded for this Phase 3 content view.'
    : 'Supabase unavailable, so the Phase 3 fallback demo dataset is being shown.';
}

export async function loadContentPageData(): Promise<{
  entries: ContentCalendarEntry[];
  stats: ReturnType<typeof contentStats>;
  source: ContentReadSource;
}> {
  const client = await getReadClientOrNull();
  if (!client) {
    return { entries: demoContent, stats: contentStats(demoContent), source: 'demo' };
  }

  const result = await (client.from('content_calendar') as any)
    .select('*')
    .order('scheduled_for', { ascending: true })
    .limit(200);

  if (result.error) {
    return { entries: demoContent, stats: contentStats(demoContent), source: 'demo' };
  }

  const entries = (result.data ?? []) as ContentCalendarEntry[];
  return { entries, stats: contentStats(entries), source: 'supabase' };
}

async function getReadClientOrNull(): Promise<any> {
  try {
    return await createClient();
  } catch {
    return serviceClientOrNull();
  }
}
