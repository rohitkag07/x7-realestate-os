export const PRESETS = {
  '9x16': { width: 1080, height: 1920, fps: 30 },
  '16x9': { width: 1920, height: 1080, fps: 30 },
  '1x1':  { width: 1080, height: 1080, fps: 30 },
  '4x5':  { width: 1080, height: 1350, fps: 30 },
} as const;
export type PresetKey = keyof typeof PRESETS;
export const platformToPreset: Record<string, PresetKey> = {
  instagram_reel: '9x16', instagram_story: '9x16', instagram_feed: '1x1', instagram_portrait: '4x5',
  facebook_reel: '9x16', facebook_feed: '1x1', youtube_shorts: '9x16', youtube_long: '16x9', google_display: '1x1',
};
