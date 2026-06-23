import Link from 'next/link';
import { CalendarDays, Users, Wrench, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

const tabs = [
  { href: '/colony/residents',  label: 'Residents',  hi: 'निवासी',  icon: Users },
  { href: '/colony/complaints', label: 'Complaints', hi: 'शिकायतें', icon: Wrench },
  { href: '/colony/visitors',   label: 'Visitors',   hi: 'विज़िटर्स',  icon: ShieldCheck },
  { href: '/colony/amenities',  label: 'Amenities',  hi: 'सुविधाएं', icon: CalendarDays },
];

export default function ColonyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Colony Management"
        titleHi="कॉलोनी मैनेजमेंट"
        description="Post-sale value engine — residents, maintenance, complaints, visitors, and amenity operations."
      />

      <nav className="flex gap-2 border-b mb-6 -mt-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary/40 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              <span>{t.label} <span className="opacity-60">· {t.hi}</span></span>
            </Link>
          );
        })}
      </nav>

      {children}
    </>
  );
}
