'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarDays, Home, Menu, MessageCircle, Settings, SlidersHorizontal, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  builderName?: string;
  onMenuClick?: () => void;
}

const quickLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/assistant-setup', label: 'Setup', icon: SlidersHorizontal },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function TopBar({ builderName = 'WhatsAI Assistant', onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const fallback = builderName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[#d8dee4] bg-white/95 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <nav className="hidden items-center gap-1 xl:flex">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Button key={link.href} asChild variant="ghost" size="sm" className={cn('rounded-full px-3 text-[#667781] hover:bg-[#e7fce3] hover:text-[#075e54]', active && 'bg-[#e7fce3] text-[#075e54]')}>
              <Link href={link.href}>
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {link.label}
              </Link>
            </Button>
          );
        })}
      </nav>

      <Button asChild variant="ghost" size="icon">
        <Link href="/chats" aria-label="Open conversations requiring attention">
          <Bell className="h-5 w-5" />
        </Link>
      </Button>

      <Link href="/settings" className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-[#e7fce3]" aria-label="Open settings">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#00a884] text-xs text-white">{fallback}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block leading-tight">
          <div className="text-sm font-medium">{builderName}</div>
          <div className="text-[10px] text-[#667781]">WhatsApp inbox and lead desk</div>
        </div>
      </Link>
    </header>
  );
}
