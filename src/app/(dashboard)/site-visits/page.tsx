import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { SiteVisitPlanner } from '@/components/sales/SiteVisitPlanner';
import { loadSiteVisitsPageData, salesReadSourceLabel } from '@/lib/sales-read';

export const metadata = { title: 'Site Visits' };

export default async function SiteVisitsPage() {
  const { visits, leads, source } = await loadSiteVisitsPageData();

  return (
    <>
      <PageHeader
        title="Site Visits"
        titleHi="साइट विज़िट्स"
        description="Weekly planning, on-ground scheduling, and post-visit feedback for conversion-ready buyers."
        actions={<Button size="sm"><CalendarPlus className="h-4 w-4 mr-2" /> Sales Calendar</Button>}
      />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{salesReadSourceLabel(source)}</p>

      <SiteVisitPlanner visits={visits} leads={leads} />
    </>
  );
}
