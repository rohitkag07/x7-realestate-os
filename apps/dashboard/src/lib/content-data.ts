import type { ContentCalendarEntry, ContentStatus, ContentType, ContentPlatform, ContentPillar } from '@/types/database';

/**
 * Phase 3 demo dataset + derived view types — mirrors the sales-data.ts
 * convention so the content views render even when Supabase is offline.
 */
export const DEMO_BUILDER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_PROJECT_ID = '22222222-2222-2222-2222-222222222222';

export interface ContentCalendarItem extends ContentCalendarEntry {
  week_label: string;
}

function entry(
  i: number,
  content_type: ContentType,
  platform: ContentPlatform,
  pillar: ContentPillar,
  caption: string,
  status: ContentStatus,
  dayOffset: number,
  virality: number | null,
): ContentCalendarEntry {
  const when = new Date();
  when.setDate(when.getDate() + dayOffset);
  const isVideo = ['reel', 'video', 'long_form_video'].includes(content_type);
  return {
    id: `demo-content-${i}`,
    project_id: DEMO_PROJECT_ID,
    builder_id: DEMO_BUILDER_ID,
    content_type, platform, pillar,
    caption,
    caption_hindi: null,
    hashtags: ['IndoreBusiness', 'WhatsAppLeads', 'AppointmentReady'],
    media_url: null,
    thumbnail_url: null,
    media_type: isVideo ? 'video' : 'image',
    scheduled_for: status === 'draft' ? null : when.toISOString(),
    published_at: status === 'published' ? when.toISOString() : null,
    status,
    engagement: {},
    virality_score: virality,
    generated_by: 'gpt-4o',
    generation_prompt: null,
    remotion_composition: isVideo ? 'PropertyWalkthrough' : null,
    higgsfield_job_id: null,
    external_post_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const demoContent: ContentCalendarEntry[] = [
  entry(1, 'post',        'instagram',  'location_advantage',  'Why Super Corridor is the next investment goldmine of Indore', 'scheduled', 1, 72),
  entry(2, 'reel',        'instagram',  'construction_update', 'Week 12 drone update — your dream home is taking shape',        'scheduled', 2, 68),
  entry(3, 'video',       'youtube',    'investment_logic',    'Plot vs Apartment — 5-year ROI compared',                       'draft',     3, null),
  entry(4, 'carousel',    'facebook',   'educational',         '5 documents to check before buying a plot',                     'review',    4, 54),
  entry(5, 'ad_creative', 'google_ads', 'ad',                  'RERA approved plots from ₹18 Lakh — limited units',             'approved',  4, 81),
  entry(6, 'story',       'instagram',  'engagement',          'Corner plot or Park-facing plot? Comment below!',               'published', -1, 45),
  entry(7, 'reel',        'instagram',  'social_proof',        'Buyer story: Rajesh ji ne 2024 me plot liya, aaj value double', 'scheduled', 5, 63),
  entry(8, 'post',        'facebook',   'lifestyle',           'Imagine waking up to this view — your own villa plot',          'draft',     6, null),
];

export function contentStats(entries: ContentCalendarEntry[]) {
  const scored = entries.map((e) => e.virality_score).filter((n): n is number => n != null);
  return {
    thisMonth: entries.length,
    rendered: entries.filter((e) => e.media_url || e.status === 'scheduled' || e.status === 'published').length,
    avgVirality: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0,
    awaitingApproval: entries.filter((e) => e.status === 'review').length,
  };
}
