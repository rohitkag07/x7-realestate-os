export const COMPOSITIONS = {
  'PropertyWalkthrough-16x9': { duration_s: 30, aspect: '16x9', platform: ['youtube_long','facebook_feed'] },
  'PropertyWalkthrough-9x16': { duration_s: 30, aspect: '9x16', platform: ['instagram_reel','youtube_shorts'] },
  'PriceReveal-9x16': { duration_s: 15, aspect: '9x16', platform: ['instagram_reel','instagram_story'] },
  'PriceReveal-1x1': { duration_s: 15, aspect: '1x1', platform: ['instagram_feed','google_display'] },
  'LocationExplainer-9x16': { duration_s: 45, aspect: '9x16', platform: ['instagram_reel'] },
  'ConstructionUpdate-9x16': { duration_s: 30, aspect: '9x16', platform: ['instagram_reel','whatsapp_status'] },
  'TestimonialReel-9x16': { duration_s: 45, aspect: '9x16', platform: ['instagram_reel'] },
  'BeforeAfter-9x16': { duration_s: 20, aspect: '9x16', platform: ['instagram_reel'] },
  'InvestmentComparison-1x1': { duration_s: 25, aspect: '1x1', platform: ['instagram_feed'] },
  'FestivalCreative-1x1': { duration_s: 10, aspect: '1x1', platform: ['instagram_feed','whatsapp_status'] },
  'AdCreative-9x16': { duration_s: 15, aspect: '9x16', platform: ['instagram_reel','facebook_reel'] },
} as const;
export type CompositionId = keyof typeof COMPOSITIONS;
