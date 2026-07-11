'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(37,211,102,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(40,231,197,0.14),transparent_26%),linear-gradient(135deg,#070A12_0%,#0B1020_42%,#101726_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenuClick={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-5 lg:px-7 lg:py-7">
            <div className="mx-auto w-full max-w-[1500px] animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[310px] border-white/10 bg-[#07101d]/95 p-0 text-white backdrop-blur-xl">
          <SheetHeader className="sr-only">
            <SheetTitle>WhatsAI Assistant navigation</SheetTitle>
            <SheetDescription>Main dashboard navigation</SheetDescription>
          </SheetHeader>
          <Sidebar className="flex h-full w-full border-r-0 bg-transparent lg:flex" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
