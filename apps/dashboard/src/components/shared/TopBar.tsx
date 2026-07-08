'use client';

import { Bell, Search, Menu } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, conversations, handoffs..."
          className="pl-9 h-9 bg-muted/40 border-transparent focus:border-input"
        />
      </div>

      <LanguageToggle />

      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{fallback}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block leading-tight">
          <div className="text-sm font-medium">{businessName}</div>
          <div className="text-[10px] text-muted-foreground">Growth Plan</div>
        </div>
      </div>
    </header>
  );
}
