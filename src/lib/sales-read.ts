import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { serviceClientOrNull } from '@/lib/sales-server';
import {
  DEMO_PROJECT,
  demoBookings,
  demoLeads,
  demoPlots,
  demoSiteVisits,
  type BookingWorkbenchItem,
  type PlotInventoryItem,
  type VisitBoardItem,
} from '@/lib/sales-data';
import type { Booking, Lead, Plot, Project, SiteVisit } from '@/types/database';

export type SalesReadSource = 'supabase' | 'demo';

export function salesReadSourceLabel(source: SalesReadSource) {
  return source === 'supabase'
    ? 'Live Supabase records loaded for this Phase 2 view.'
    : 'Supabase unavailable, so the Phase 2 fallback demo dataset is being shown.';
}

export async function loadLeadsPageData(): Promise<{
  leads: Lead[];
  source: SalesReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) return { leads: demoLeads, source: 'demo' };

  const leadsResult = await (client.from('leads') as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(120);

  if (leadsResult.error) return { leads: demoLeads, source: 'demo' };

  return {
    leads: (leadsResult.data ?? []) as Lead[],
    source: 'supabase',
  };
}

export async function loadSiteVisitsPageData(): Promise<{
  leads: Lead[];
  visits: VisitBoardItem[];
  source: SalesReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) return { leads: demoLeads, visits: demoSiteVisits, source: 'demo' };

  const [leadsResult, visitsResult, projectsResult] = await Promise.all([
    (client.from('leads') as any).select('*').order('created_at', { ascending: false }).limit(120),
    (client.from('site_visits') as any).select('*').order('scheduled_date', { ascending: true }).limit(120),
    (client.from('projects') as any).select('*').order('created_at', { ascending: false }).limit(40),
  ]);

  if (leadsResult.error || visitsResult.error || projectsResult.error) {
    return { leads: demoLeads, visits: demoSiteVisits, source: 'demo' };
  }

  const leads = (leadsResult.data ?? []) as Lead[];
  const visits = (visitsResult.data ?? []) as SiteVisit[];
  const projects = (projectsResult.data ?? []) as Project[];

  return {
    leads,
    visits: buildVisitBoardItems(visits, leads, projects),
    source: 'supabase',
  };
}

export async function loadBookingsPageData(): Promise<{
  leads: Lead[];
  plots: PlotInventoryItem[];
  bookings: BookingWorkbenchItem[];
  source: SalesReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) {
    return {
      leads: demoLeads,
      plots: demoPlots,
      bookings: demoBookings,
      source: 'demo',
    };
  }

  const [leadsResult, plotsResult, bookingsResult, projectsResult] = await Promise.all([
    (client.from('leads') as any).select('*').order('created_at', { ascending: false }).limit(120),
    (client.from('plots') as any).select('*').order('plot_number', { ascending: true }).limit(240),
    (client.from('bookings') as any).select('*').order('booking_date', { ascending: false }).limit(120),
    (client.from('projects') as any).select('*').order('created_at', { ascending: false }).limit(40),
  ]);

  if (leadsResult.error || plotsResult.error || bookingsResult.error || projectsResult.error) {
    return {
      leads: demoLeads,
      plots: demoPlots,
      bookings: demoBookings,
      source: 'demo',
    };
  }

  const leads = (leadsResult.data ?? []) as Lead[];
  const plots = (plotsResult.data ?? []) as Plot[];
  const bookings = (bookingsResult.data ?? []) as Booking[];
  const projects = (projectsResult.data ?? []) as Project[];

  return {
    leads,
    plots: buildPlotInventoryItems(plots, leads),
    bookings: buildBookingWorkbenchItems(bookings, leads, plots, projects),
    source: 'supabase',
  };
}

function getReadClientOrNull(): any {
  try {
    return createClient();
  } catch {
    return serviceClientOrNull();
  }
}

function buildVisitBoardItems(
  visits: SiteVisit[],
  leads: Lead[],
  projects: Project[],
): VisitBoardItem[] {
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  return visits
    .map((visit) => {
      const lead = leadsById.get(visit.lead_id);
      const project = projectsById.get(visit.project_id);

      return {
        ...visit,
        lead_name: lead?.name ?? 'Unknown lead',
        lead_phone: lead?.phone ?? '',
        project_name: project?.name ?? DEMO_PROJECT.name,
        budget_range: lead?.budget_range ?? null,
      };
    })
    .sort((left, right) => `${left.scheduled_date}${left.scheduled_time}`.localeCompare(`${right.scheduled_date}${right.scheduled_time}`));
}

function buildPlotInventoryItems(
  plots: Plot[],
  leads: Lead[],
): PlotInventoryItem[] {
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));

  return plots.map((plot) => {
    const buyer = plot.booked_by ? leadsById.get(plot.booked_by) : null;
    return {
      ...plot,
      lead_name: buyer?.name ?? null,
      token_due: plot.status === 'token' ? plot.token_amount ?? 50_000 : null,
    };
  });
}

function buildBookingWorkbenchItems(
  bookings: Booking[],
  leads: Lead[],
  plots: Plot[],
  projects: Project[],
): BookingWorkbenchItem[] {
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const plotsById = new Map(plots.map((plot) => [plot.id, plot]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  return bookings.map((booking) => {
    const lead = leadsById.get(booking.lead_id);
    const plot = booking.plot_id ? plotsById.get(booking.plot_id) : null;
    const project = projectsById.get(booking.project_id);

    return {
      ...booking,
      buyer_name: lead?.name ?? 'Unknown buyer',
      plot_label: plot?.plot_number ?? 'Plot TBD',
      project_name: project?.name ?? DEMO_PROJECT.name,
    };
  });
}
