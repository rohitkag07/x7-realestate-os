'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Home,
  MessageCircle,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

type Item = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: Item[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Morning overview', icon: Home },
  { href: '/chats', label: 'Chats', description: 'WhatsApp inbox', icon: MessageCircle },
  { href: '/calendar', label: 'Calendar', description: 'Appointments', icon: CalendarDays },
  { href: '/leads', label: 'Leads', description: 'Active leads', icon: Users },
  { href: '/assistant-setup', label: 'Setup', description: 'Connect WhatsApp', icon: SlidersHorizontal },
  { href: '/settings', label: 'Settings', description: 'Business setup', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex h-screen w-72 shrink-0 flex-col border-r border-[#d8dee4] bg-white sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#d8dee4]">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00a884] text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-[#111b21]">{APP_NAME}</div>
          <div className="mt-0.5 text-[11px] text-[#667781]">{APP_TAGLINE}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-[#e7fce3] text-[#075e54] shadow-sm ring-1 ring-[#b7efc5]'
                  : 'text-[#667781] hover:bg-[#f0f2f5] hover:text-[#111b21]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold">{item.label}</span>
                <span className={cn('mt-0.5 text-[11px]', isActive ? 'text-[#128c7e]' : 'text-[#8696a0]')}>
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-2xl border border-[#d8dee4] bg-[#f0f2f5] p-4 text-[12px] text-[#667781]">
        <div className="font-semibold text-[#111b21]">Owner-friendly mode</div>
        <p className="mt-1 leading-relaxed">Focused on inbox, leads, setup, and handoffs.</p>
      </div>
    </aside>
  );
}
