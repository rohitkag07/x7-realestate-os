import { CalendarCheck2, Clock3, IndianRupee, MapPinned } from 'lucide-react';
import { AmenityBookingPanel } from '@/components/colony/AmenityBookingPanel';
import { NoticeComposer } from '@/components/colony/NoticeComposer';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { colonyReadSourceLabel, loadAmenitiesPageData, loadColonyWorkspaceContext } from '@/lib/colony-read';
import { formatINR } from '@/lib/utils';

export const metadata = { title: 'Colony · Amenities' };

export default async function AmenitiesPage() {
  const [{ amenities, bookings, residents, source }, workspace] = await Promise.all([
    loadAmenitiesPageData(),
    loadColonyWorkspaceContext(),
  ]);

  const upcoming = bookings.filter((booking) => booking.status === 'confirmed').length;
  const revenue = bookings.reduce((sum, booking) => sum + booking.fee, 0);
  const freeAmenities = amenities.filter((amenity) => amenity.hourly_rate === 0).length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard label="Enabled Amenities" labelHi="चालू सुविधाएं" value={amenities.length} icon={MapPinned} accent="primary" />
        <KPICard label="Upcoming Slots" labelHi="आने वाले स्लॉट" value={upcoming} icon={CalendarCheck2} accent="success" />
        <KPICard label="Slot Revenue" labelHi="स्लॉट रेवेन्यू" value={formatINR(revenue)} icon={IndianRupee} accent="warning" />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Amenity Desk</CardTitle>
              <CardDescription>{colonyReadSourceLabel(source)}</CardDescription>
            </div>
            <NoticeComposer projectId={workspace.projectId} builderId={workspace.builderId} triggerLabel="Facility Notice" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {freeAmenities} amenities are free-to-use. Chargeable slots should be booked through this desk so payment links and availability remain consistent.
          </div>
          <AmenityBookingPanel amenities={amenities} bookings={bookings} residents={residents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            Facility Rules
          </CardTitle>
          <CardDescription>Operational notes from the currently enabled amenities.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {amenities.map((amenity) => (
            <div key={amenity.id} className="rounded-lg border px-4 py-4">
              <div className="text-sm font-medium">{amenity.name}</div>
              <div className="mt-1 text-xs text-muted-foreground capitalize">{amenity.kind}</div>
              <div className="mt-3 text-sm text-muted-foreground">{amenity.rules ?? 'Standard resident booking policy applies.'}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
