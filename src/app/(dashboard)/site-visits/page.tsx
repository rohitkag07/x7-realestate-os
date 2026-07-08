import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { SiteVisitPlanner } from '@/components/sales/SiteVisitPlanner';
import { loadSiteVisitsPageData, salesReadSourceLabel } from '@/lib/sales-read';

export const metadata = { title: 'Appointments' };

export default async function SiteVisitsPage() {
  const { visits, leads, source } = await loadSiteVisitsPageData();

  return (
    <>
      <PageHeader
        title="Appointments"
        titleHi="अपॉइंटमेंट्स"
        description="WhatsApp-qualified leads that need a visit, call, consultation, demo, or booking slot."
        actions={<Button size="sm"><CalendarPlus className="h-4 w-4 mr-2" /> Assistant Calendar</Button>}
      />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{salesReadSourceLabel(source)}</p>

      <SiteVisitPlanner visits={visits} leads={leads} />
    </>
  );
}
