'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus2, DoorOpen, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatINR } from '@/lib/utils';
import type { Amenity, Resident } from '@/types/database';
import type { AmenityBookingView } from '@/lib/colony-data';

interface AmenityBookingPanelProps {
  amenities: Amenity[];
  bookings: AmenityBookingView[];
  residents: Resident[];
}

export function AmenityBookingPanel({ amenities, bookings, residents }: AmenityBookingPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const residentOptions = useMemo(() => residents.filter((resident) => resident.status !== 'vacant'), [residents]);
  const [amenityId, setAmenityId] = useState(amenities[0]?.id ?? '');
  const [residentId, setResidentId] = useState(residentOptions[0]?.id ?? '');
  const [bookingDate, setBookingDate] = useState(new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guests, setGuests] = useState('4');

  const selectedAmenity = amenities.find((item) => item.id === amenityId) ?? null;
  const todayBookings = bookings.slice(0, 6);
  const hours = Math.max(1, timeDiff(startTime, endTime));
  const estimatedFee = selectedAmenity ? selectedAmenity.hourly_rate * hours : 0;

  if (amenities.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          No amenities configured yet. Seed the `amenities` table or connect Supabase to start bookings.
        </CardContent>
      </Card>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!amenityId || !residentId) {
      toast.error('Amenity and resident are required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/colony/amenities/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amenity_id: amenityId,
            resident_id: residentId,
            date: bookingDate,
            start_time: startTime,
            end_time: endTime,
            guests: Number(guests || 1),
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? response.statusText);
        toast.success(result?.upi_link ? 'Booking created with UPI payment link' : 'Amenity booked');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Amenity booking failed');
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarPlus2 className="h-4 w-4 text-primary" />
            Book Amenity
          </CardTitle>
          <CardDescription>Create clubhouse, guest room, or court reservations for residents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Amenity</Label>
              <Select value={amenityId} onValueChange={setAmenityId}>
                <SelectTrigger><SelectValue placeholder="Select amenity" /></SelectTrigger>
                <SelectContent>
                  {amenities.map((amenity) => (
                    <SelectItem key={amenity.id} value={amenity.id}>
                      {amenity.name} · {amenity.open_time}-{amenity.close_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Resident</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                <SelectContent>
                  {residentOptions.map((resident) => (
                    <SelectItem key={resident.id} value={resident.id}>
                      {resident.name} · {resident.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-date">Date</Label>
              <Input id="booking-date" type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-guests">Guests</Label>
              <Input id="booking-guests" type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-start">Start Time</Label>
              <Input id="booking-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-end">End Time</Label>
              <Input id="booking-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{selectedAmenity?.name ?? 'Select an amenity'}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedAmenity?.capacity ? `Capacity ${selectedAmenity.capacity}` : 'No capacity set'} · {selectedAmenity?.rules ?? 'Standard booking rules apply'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Estimated Fee</div>
                  <div className="text-sm font-semibold">{formatINR(estimatedFee, { compact: false })}</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                <DoorOpen className="mr-2 h-4 w-4" />
                {pending ? 'Booking…' : 'Confirm Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="h-4 w-4 text-emerald-500" />
            Upcoming Bookings
          </CardTitle>
          <CardDescription>Recent amenity reservations and collection status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayBookings.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No amenity bookings yet.
            </div>
          ) : (
            todayBookings.map((booking) => (
              <div key={booking.id} className="rounded-lg border px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{booking.amenity_name}</div>
                    <div className="text-xs text-muted-foreground">{booking.resident_name}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(booking.booking_date)} · {booking.start_time}-{booking.end_time}</span>
                  <span>{formatINR(booking.fee, { compact: false })}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function timeDiff(start: string, end: string) {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return ((endH - startH) * 60 + (endM - startM)) / 60;
}
