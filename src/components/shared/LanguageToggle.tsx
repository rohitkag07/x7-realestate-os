'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Hindi <-> English toggle. Wired client-side only for now; later we
 * persist this to user preferences and propagate via React context.
 */
export function LanguageToggle() {
  const [locale, setLocale] = useState<'hi' | 'en'>('hi');

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-xs"
      onClick={() => setLocale(locale === 'hi' ? 'en' : 'hi')}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium">{locale === 'hi' ? 'हिं' : 'EN'}</span>
    </Button>
  );
}
