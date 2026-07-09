'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3, BookOpen, BriefcaseBusiness, Building2, CalendarCheck, ChevronDown,
  CreditCard, FileText, Handshake, Image as ImageIcon, IndianRupee,
  LayoutDashboard, Megaphone, MessageSquare, Radio, Settings, Sparkles, Store, UserCheck, Zap,
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
export function Sidebar({ className }: { className?: string }) {
  return (
    <Suspense fallback={<SidebarShell className={className} />}>
      <SidebarContent className={className} />
    </Suspense>
  );
}

function SidebarContent({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;

  return (
    <SidebarShell className={className}>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <NavSection key={section.label} section={section} currentHref={currentHref} pathname={pathname} />
        ))}
      </nav>
    </SidebarShell>
  );
}

function SidebarShell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <aside className={cn('hidden h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#07101d]/82 shadow-[24px_0_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:flex sticky top-0', className)}>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_36px_rgba(37,211,102,0.28)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{APP_NAME}</div>
          <div className="text-[10px] text-muted-foreground">{APP_TAGLINE}</div>
        </div>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/8 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-emerald-100">AI receptionist live</div>
              <div className="text-[10px] text-emerald-200/70">WhatsApp connected · Trial day 3</div>
            </div>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200">
              <span className="absolute h-3 w-3 rounded-full bg-emerald-400/40 animate-ping" />
              <Radio className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
      {children ?? <div className="flex-1" />}
      <div className="border-t border-white/10 p-4 text-[11px] text-muted-foreground">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="font-medium text-foreground">X7 Trial Console</div>
          <div className="mt-1">v0.3.0 · Coaching, clinic, real estate ready</div>
        </div>
      </div>
    </aside>
  );
}
function NavSection({ section, currentHref, pathname }: { section: Section; currentHref: string; pathname: string }) {
  const hasActiveItem = section.items.some((item) => isItemActive(item.href, currentHref, pathname));
  if (section.advanced) {
    return (
      <details className="group" open={hasActiveItem}>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:bg-white/6 hover:text-foreground">
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
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition duration-200',
        isActive
          ? 'bg-primary/95 text-primary-foreground shadow-[0_16px_40px_rgba(37,211,102,0.20)]'
          : 'text-muted-foreground hover:bg-white/6 hover:text-foreground',
      )}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition', isActive ? 'bg-black/10' : 'bg-white/[0.04] group-hover:bg-white/8')}>
        <Icon className="h-4 w-4" />
      </span>
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
