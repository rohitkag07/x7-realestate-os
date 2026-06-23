import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { serviceClientOrNull } from '@/lib/colony-server';
import {
  DEMO_BUILDER_ID, DEMO_PROJECT_ID, demoResidents, demoComplaints, demoVisitors, demoNotices, demoAmenities, demoAmenityBookings, demoColonyKpis, colonyKpisFrom,
  type AmenityBookingView, type ColonyKpis, type NoticeItem,
} from '@/lib/colony-data';
import type { Amenity, AmenityBooking, Resident, Complaint, Visitor } from '@/types/database';

export type ColonyReadSource = 'supabase' | 'demo';

export function colonyReadSourceLabel(source: ColonyReadSource) {
  return source === 'supabase'
    ? 'Live Supabase records loaded for this Phase 5 colony view.'
    : 'Supabase unavailable, so the Phase 5 fallback demo dataset is being shown.';
}

function getReadClientOrNull(): any {
  try {
    return createClient();
  } catch {
    return serviceClientOrNull();
  }
}

export async function loadResidentsPageData(): Promise<{ residents: Resident[]; kpis: ColonyKpis; source: ColonyReadSource }> {
  const client = getReadClientOrNull();
  if (!client) return { residents: demoResidents, kpis: demoColonyKpis, source: 'demo' };

  const [residentsResult, complaintsResult, visitorsResult, monthRow] = await Promise.all([
    (client.from('residents') as any).select('*').order('created_at', { ascending: false }).limit(200),
    (client.from('complaints') as any).select('status').limit(500),
    (client.from('visitors') as any).select('approval_status').limit(200),
    (client.from('v_monthly_collection') as any).select('billed, collected, pending, collection_rate_pct').eq('month', new Date().toISOString().slice(0, 7)).maybeSingle(),
  ]);
  if (residentsResult.error) return { residents: demoResidents, kpis: demoColonyKpis, source: 'demo' };

  const residents = (residentsResult.data ?? []) as Resident[];
  const complaints = (complaintsResult.data ?? []) as Complaint[];
  const visitors = (visitorsResult.data ?? []) as Visitor[];
  const m = monthRow?.data ?? {};
  const kpis = {
    ...colonyKpisFrom(residents, complaints, visitors),
    this_month_collected: m.collected ?? 0,
    this_month_pending: m.pending ?? 0,
    collection_rate: m.collection_rate_pct ?? null,
  };
  return { residents, kpis, source: 'supabase' };
}

export async function loadComplaintsPageData(): Promise<{ complaints: Complaint[]; source: ColonyReadSource }> {
  const client = getReadClientOrNull();
  if (!client) return { complaints: demoComplaints, source: 'demo' };
  const result = await (client.from('complaints') as any).select('*').order('created_at', { ascending: false }).limit(200);
  if (result.error) return { complaints: demoComplaints, source: 'demo' };
  return { complaints: (result.data ?? []) as Complaint[], source: 'supabase' };
}

export async function loadVisitorsPageData(): Promise<{ visitors: Visitor[]; source: ColonyReadSource }> {
  const client = getReadClientOrNull();
  if (!client) return { visitors: demoVisitors, source: 'demo' };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const result = await (client.from('visitors') as any).select('*').gte('entry_time', start.toISOString()).order('entry_time', { ascending: false }).limit(200);
  if (result.error) return { visitors: demoVisitors, source: 'demo' };
  return { visitors: (result.data ?? []) as Visitor[], source: 'supabase' };
}

export async function loadNoticesPageData(): Promise<{ notices: NoticeItem[]; source: ColonyReadSource }> {
  const client = getReadClientOrNull();
  if (!client) return { notices: demoNotices, source: 'demo' };
  const result = await (client.from('notices') as any).select('*').order('created_at', { ascending: false }).limit(50);
  if (result.error) return { notices: demoNotices, source: 'demo' };
  return { notices: (result.data ?? []) as NoticeItem[], source: 'supabase' };
}

export async function loadAmenitiesPageData(): Promise<{
  amenities: Amenity[];
  bookings: AmenityBookingView[];
  residents: Resident[];
  source: ColonyReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) {
    return {
      amenities: demoAmenities,
      bookings: demoAmenityBookings,
      residents: demoResidents,
      source: 'demo',
    };
  }

  const [amenitiesResult, bookingsResult, residentsResult] = await Promise.all([
    (client.from('amenities') as any).select('*').eq('enabled', true).order('name', { ascending: true }).limit(100),
    (client.from('amenity_bookings') as any).select('*').order('booking_date', { ascending: true }).limit(120),
    (client.from('residents') as any).select('*').neq('status', 'vacant').order('created_at', { ascending: false }).limit(200),
  ]);

  if (amenitiesResult.error || bookingsResult.error || residentsResult.error) {
    return {
      amenities: demoAmenities,
      bookings: demoAmenityBookings,
      residents: demoResidents,
      source: 'demo',
    };
  }

  const amenities = (amenitiesResult.data ?? []) as Amenity[];
  const bookings = (bookingsResult.data ?? []) as AmenityBooking[];
  const residents = (residentsResult.data ?? []) as Resident[];

  return {
    amenities,
    bookings: hydrateAmenityBookings(bookings, amenities, residents),
    residents,
    source: 'supabase',
  };
}

export async function loadColonyWorkspaceContext(projectIdHint?: string): Promise<{
  projectId: string;
  builderId: string;
  source: ColonyReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) {
    return {
      projectId: projectIdHint ?? DEMO_PROJECT_ID,
      builderId: DEMO_BUILDER_ID,
      source: 'demo',
    };
  }

  const query = projectIdHint
    ? (client.from('projects') as any).select('id, builder_id').eq('id', projectIdHint).maybeSingle()
    : (client.from('projects') as any).select('id, builder_id').order('created_at', { ascending: false }).limit(1).maybeSingle();

  const result = await query;
  if (result.error || !result.data) {
    return {
      projectId: projectIdHint ?? DEMO_PROJECT_ID,
      builderId: DEMO_BUILDER_ID,
      source: 'demo',
    };
  }

  return {
    projectId: result.data.id ?? projectIdHint ?? DEMO_PROJECT_ID,
    builderId: result.data.builder_id ?? DEMO_BUILDER_ID,
    source: 'supabase',
  };
}

function hydrateAmenityBookings(
  bookings: AmenityBooking[],
  amenities: Amenity[],
  residents: Resident[],
): AmenityBookingView[] {
  const amenitiesById = new Map(amenities.map((item) => [item.id, item]));
  const residentsById = new Map(residents.map((item) => [item.id, item]));

  return bookings.map((booking) => ({
    ...booking,
    amenity_name: amenitiesById.get(booking.amenity_id)?.name ?? 'Amenity',
    resident_name: residentsById.get(booking.resident_id)?.name ?? 'Resident',
  }));
}
