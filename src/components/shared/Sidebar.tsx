'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, IndianRupee, Image as ImageIcon,
  Megaphone, Building2, BarChart3, Settings, Sparkles, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

type Item = {
  href: string;
  labelHi: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: Item[] = [
  { href: '/',             labelHi: 'डैशबोर्ड',      labelEn: 'Dashboard',    icon: LayoutDashboard },
  { href: '/leads',        labelHi: 'लीड्स',         labelEn: 'Leads',        icon: Users },
  { href: '/site-visits',  labelHi: 'अपॉइंटमेंट',     labelEn: 'Appointments', icon: Calendar },
  { href: '/bookings',     labelHi: 'हैंडऑफ',         labelEn: 'Handoffs',     icon: IndianRupee },
  { href: '/content',      labelHi: 'कंटेंट',         labelEn: 'Playbooks',    icon: ImageIcon },
  { href: '/campaigns',    labelHi: 'कैम्पेन',        labelEn: 'Campaigns',    icon: Megaphone },
  { href: '/ghost-closer', labelHi: 'आउटबाउंड',       labelEn: 'Ghost Closer', icon: Zap },
  { href: '/colony',       labelHi: 'ऑपरेशंस',       labelEn: 'Ops',          icon: Building2 },
  { href: '/reports',      labelHi: 'रिपोर्ट्स',      labelEn: 'Reports',      icon: BarChart3 },
  { href: '/settings',     labelHi: 'सेटिंग्स',       labelEn: 'Settings',     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r bg-card sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{APP_NAME}</div>
          <div className="text-[10px] text-muted-foreground">{APP_TAGLINE}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{item.labelEn}</span>
                <span className={cn('text-[10px]', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                  {item.labelHi}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t text-[11px] text-muted-foreground">
        v0.2.0 · WhatsAI Production Proof
      </div>
    </aside>
  );
}
