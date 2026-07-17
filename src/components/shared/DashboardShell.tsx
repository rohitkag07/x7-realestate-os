'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="flex min-h-screen bg-[#f0f2f5]">
    <Sidebar />
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent side="left" className="w-72 p-0 sm:max-w-72"><Sidebar mobile onNavigate={() => setMenuOpen(false)} /></SheetContent>
    </Sheet>
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
    </div>
  </div>;
}
