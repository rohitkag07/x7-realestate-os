import { Download, IndianRupee } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/shared/KPICard';
import { BookingWorkbench } from '@/components/sales/BookingWorkbench';
import { loadBookingsPageData, salesReadSourceLabel } from '@/lib/sales-read';
import { formatINR } from '@/lib/utils';

export const metadata = { title: 'Handoffs' };

export default async function BookingsPage() {
  const { bookings, leads, plots, source } = await loadBookingsPageData();
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.token_amount, 0);

  return (
    <>
      <PageHeader
        title="Handoffs"
        titleHi="हैंडऑफ"
        description="Hot WhatsApp leads that need owner action, payment follow-up, or sales-team closure."
        actions={<Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export Handoffs</Button>}
      />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{salesReadSourceLabel(source)}</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total Handoffs" value={bookings.length} icon={IndianRupee} accent="success" />
        <KPICard label="Value Tagged" value={formatINR(totalRevenue)} icon={IndianRupee} accent="success" />
        <KPICard label="Open Slots" value={plots.filter((plot) => plot.status === 'available').length} icon={IndianRupee} accent="primary" />
        <KPICard label="Blocked / Pending" value={plots.filter((plot) => plot.status === 'blocked' || plot.status === 'token').length} icon={IndianRupee} accent="warning" />
      </section>

      <BookingWorkbench leads={leads} plots={plots} bookings={bookings} />
    </>
  );
}
