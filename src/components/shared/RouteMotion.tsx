'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function RouteMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.fromTo(
      root.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power2.out', clearProps: 'all' },
    );
  }, { scope: root, dependencies: [pathname] });

  return <div ref={root} className="min-h-full">{children}</div>;
}
