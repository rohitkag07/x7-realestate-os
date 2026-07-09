'use client';

import { Bell, Command, Menu, Search, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from './LanguageToggle';

interface TopBarProps {
  businessName?: string;
  onMenuClick?: () => void;
}

export function TopBar({ businessName = 'Phase 6 Trial Business', onMenuClick }: TopBarProps) {
  const fallback = businessName.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/62 px-4 py-3 backdrop-blur-2xl lg:px-7">
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-xl sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, conversations, handoffs..."
          className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-300/30"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-muted-foreground md:flex">
          <Command className="h-3 w-3" />
          K
        </div>
      </div>

      <div className="mr-auto flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/8 px-3 py-1.5 text-xs text-emerald-100 sm:mr-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(37,211,102,0.9)]" />
        <span className="hidden sm:inline">Live WhatsApp</span>
      </div>

      <LanguageToggle />

      <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
      </Button>

      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{fallback}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block leading-tight">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {businessName}
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div className="text-[10px] text-muted-foreground">7-day managed trial</div>
        </div>
      </div>
      </div>
    </header>
  );
}
