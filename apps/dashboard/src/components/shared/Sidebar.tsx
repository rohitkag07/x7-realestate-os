'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3, BookOpen, BriefcaseBusiness, Building2, CalendarCheck, ChevronDown,
  CreditCard, FileText, Handshake, Image as ImageIcon, IndianRupee,
  LayoutDashboard, Megaphone, MessageSquare, Settings, Sparkles, Store, UserCheck, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

type Item = {
  href: string;
  labelHi: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
};
type Section = {
  label: string;
  advanced?: boolean;
  items: Item[];
};
const sections: Section[] = [
  {
    label: 'WhatsAI Assistant',
    items: [
      { href: '/',              labelHi: 'डैशबोर्ड',       labelEn: 'Dashboard',       icon: LayoutDashboard },
      { href: '/conversations', labelHi: 'बातचीत',          labelEn: 'Conversations',   icon: MessageSquare },
      { href: '/leads',         labelHi: 'क्वालिफाइड लीड्स', labelEn: 'Qualified Leads', icon: UserCheck },
      { href: '/handoffs',      labelHi: 'हैंडऑफ',          labelEn: 'Handoffs',        icon: Handshake },
      { href: '/site-visits',   labelHi: 'अपॉइंटमेंट्स',    labelEn: 'Appointments',    icon: CalendarCheck },
      { href: '/summaries',     labelHi: 'डेली समरी',       labelEn: 'Daily Summary',   icon: FileText },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/playbooks',             labelHi: 'प्लेबुक सेटअप', labelEn: 'Playbook Setup',  icon: BookOpen },
      { href: '/settings?tab=profile',  labelHi: 'बिज़नेस प्रोफाइल', labelEn: 'Business Profile', icon: BriefcaseBusiness },
      { href: '/settings?tab=billing',  labelHi: 'बिलिंग / ट्रायल',  labelEn: 'Billing / Trial',  icon: CreditCard },
    ],
  },
  {
    label: 'SiteVisit AI Pack',
    items: [
      { href: '/bookings', labelHi: 'बुकिंग्स', labelEn: 'Bookings', icon: IndianRupee },
      { href: '/trials',   labelHi: 'ट्रायल्स', labelEn: 'Trials',   icon: Store },
    ],
  },
  {
    label: 'Advanced',
    advanced: true,
    items: [
      { href: '/content',      labelHi: 'कंटेंट',    labelEn: 'Content',      icon: ImageIcon },
      { href: '/campaigns',    labelHi: 'कैम्पेन',   labelEn: 'Campaigns',    icon: Megaphone },
      { href: '/ghost-closer', labelHi: 'आउटबाउंड',  labelEn: 'Ghost Closer', icon: Zap },
      { href: '/colony',       labelHi: 'कॉलोनी',    labelEn: 'Colony',       icon: Building2 },
      { href: '/reports',      labelHi: 'रिपोर्ट्स', labelEn: 'Reports',      icon: BarChart3 },
      { href: '/settings',     labelHi: 'सेटिंग्स',  labelEn: 'Settings',     icon: Settings },
    ],
  },
];
export function Sidebar() {
  return (
    <Suspense fallback={<SidebarShell />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;

  return (
    <SidebarShell>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <NavSection key={section.label} section={section} currentHref={currentHref} pathname={pathname} />
        ))}
      </nav>
    </SidebarShell>
  );
}

function SidebarShell({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r bg-card sticky top-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{APP_NAME}</div>
          <div className="text-[10px] text-muted-foreground">{APP_TAGLINE}</div>
        </div>
      </div>
      {children ?? <div className="flex-1" />}
      <div className="p-4 border-t text-[11px] text-muted-foreground">
        v0.3.0 · WhatsAI Trial Console
      </div>
    </aside>
  );
}
function NavSection({ section, currentHref, pathname }: { section: Section; currentHref: string; pathname: string }) {
  const hasActiveItem = section.items.some((item) => isItemActive(item.href, currentHref, pathname));
  if (section.advanced) {
    return (
      <details className="group" open={hasActiveItem}>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:bg-muted hover:text-foreground">
          {section.label}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-1 space-y-1">
          {section.items.map((item) => <NavItem key={item.href} item={item} currentHref={currentHref} pathname={pathname} />)}
        </div>
      </details>
    );
  }

  return (
    <div>
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {section.label}
      </p>
      <div className="space-y-1">
        {section.items.map((item) => <NavItem key={item.href} item={item} currentHref={currentHref} pathname={pathname} />)}
      </div>
    </div>
  );
}
function NavItem({ item, currentHref, pathname }: { item: Item; currentHref: string; pathname: string }) {
  const isActive = isItemActive(item.href, currentHref, pathname);
  const Icon = item.icon;
  return (
    <Link
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
}
function isItemActive(href: string, currentHref: string, pathname: string) {
  if (href.includes('?')) return currentHref === href;
  if (href === '/settings') return currentHref === '/settings';
  const path = href.split('?')[0];
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}
