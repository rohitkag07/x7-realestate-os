'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import { RouteMotion } from '@/components/shared/RouteMotion';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="flex min-h-screen bg-transparent">
    <Sidebar />
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent side="left" className="w-72 p-0 sm:max-w-72">
        <SheetHeader className="sr-only">
          <SheetTitle>WhatsAI navigation</SheetTitle>
          <SheetDescription>Open a dashboard workspace.</SheetDescription>
        </SheetHeader>
        <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
      </SheetContent>
    </Sheet>
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <main className="flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-7"><RouteMotion>{children}</RouteMotion></main>
    </div>
  </div>;
}
