import packs from '../../shared/hinglish-synonyms.json';

export const HINGLISH_SYNONYM_PACK_VERSION = packs.version;
export const HINGLISH_INTENTS = ['price', 'location', 'timing', 'booking', 'offers'] as const;
export type HinglishIntent = (typeof HINGLISH_INTENTS)[number];

export const hinglishSynonymPacks: Record<HinglishIntent, readonly string[]> = {
  price: packs.price,
  location: packs.location,
  timing: packs.timing,
  booking: packs.booking,
  offers: packs.offers,
};

export function inferHinglishIntent(value: string, normalize: (input: string) => string): HinglishIntent | null {
  const message = normalize(value);
  if (!message) return null;
  for (const intent of HINGLISH_INTENTS) {
    if (hinglishSynonymPacks[intent].some((alias) => containsPhrase(message, normalize(alias)))) return intent;
  }
  return null;
}

function containsPhrase(message: string, phrase: string) {
  return Boolean(phrase) && (` ${message} `).includes(` ${phrase} `);
}
