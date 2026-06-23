import type {
  Booking,
  Lead,
  LeadStage,
  LeadTemperature,
  Plot,
  PlotStatus,
  SiteVisit,
  SiteVisitStatus,
} from '@/types/database';
import { buildUpiLink } from '@/lib/utils';

export const DEMO_BUILDER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_PROJECT_ID = '22222222-2222-2222-2222-222222222222';

export const DEMO_PROJECT = {
  id: DEMO_PROJECT_ID,
  name: 'Krishna Greens',
  city: 'Indore',
  location: 'Super Corridor, Near IT Park',
  priceBand: '₹18L - ₹45L',
  paymentVpa: 'bookings@shreekrishna',
  paymentName: 'Shree Krishna Developers',
};

export type LeadActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone?: 'neutral' | 'good' | 'alert';
};

export type LeadConversationMessage = {
  id: string;
  at: string;
  direction: 'inbound' | 'outbound';
  channel: 'whatsapp' | 'call' | 'site_visit';
  body: string;
};

export type LeadProfile = {
  leadId: string;
  sourceLabel: string;
  summary: string;
  tags: string[];
  assignedTo: string;
  preferredProjectArea: string;
  preferredPlots: string[];
  nextAction: string;
  whatsapp: LeadConversationMessage[];
  activity: LeadActivityItem[];
};

export type VisitBoardItem = SiteVisit & {
  lead_name: string;
  lead_phone: string;
  project_name: string;
  budget_range: Lead['budget_range'];
};

export type PlotInventoryItem = Plot & {
  lead_name?: string | null;
  token_due?: number | null;
};

export type BookingWorkbenchItem = Booking & {
  buyer_name: string;
  plot_label: string;
  project_name: string;
};

function isoDaysFromNow(daysOffset: number, hours = 10, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function makeLead(
  idSuffix: string,
  name: string,
  phone: string,
  lead_stage: LeadStage,
  temperature: LeadTemperature,
  source: Lead['source'],
  lead_score: number,
  budget_range: Lead['budget_range'],
  extras?: Partial<Lead>,
): Lead {
  const createdAt = isoDaysFromNow(-1 * (Number(idSuffix) + 1), 11, 10);
  return {
    id: `a0000001-0000-0000-0000-0000000000${idSuffix}`,
    project_id: DEMO_PROJECT_ID,
    builder_id: DEMO_BUILDER_ID,
    name,
    phone,
    email: null,
    source,
    campaign_id: source === 'meta_ad' ? 'meta-may-click-wa' : null,
    ad_id: source === 'meta_ad' ? 'meta-creative-03' : null,
    budget_range,
    purpose: 'self_use',
    timeline: lead_stage === 'negotiation' || lead_stage === 'booked' ? 'immediate' : '3_months',
    lead_score,
    lead_stage,
    temperature,
    lost_reason: lead_stage === 'lost' ? 'Went with a gated project inside city limits' : null,
    assigned_to: 'Arjun Sales',
    notes: null,
    whatsapp_session: {},
    last_contacted_at: isoDaysFromNow(-1, 17, 15),
    created_at: createdAt,
    updated_at: isoDaysFromNow(0, 9, 0),
    ...extras,
  };
}

export const demoLeads: Lead[] = [
  makeLead('01', 'Rajesh Sharma', '+919811112201', 'new', 'hot', 'meta_ad', 82, '25-40L', {
    notes: 'Asked specifically for corner + east-facing options. Wants brochure on WhatsApp.',
  }),
  makeLead('02', 'Priya Verma', '+919811112202', 'qualified', 'warm', 'whatsapp', 65, '15-25L', {
    purpose: 'investment',
    timeline: '6_months+',
    notes: 'Investor profile. Open to 1000-1200 sqft inventory if rental upside is clear.',
  }),
  makeLead('03', 'Sunil Yadav', '+919811112203', 'visit_scheduled', 'hot', 'google_ad', 91, '40L+', {
    notes: 'Senior IT manager. Wants Sunday family site visit and RERA certificate.',
  }),
  makeLead('04', 'Ankit Patil', '+919811112204', 'visited', 'warm', 'referral', 55, '25-40L', {
    timeline: 'immediate',
    notes: 'Visited with spouse. Comparing with one Bhopal builder launch.',
  }),
  makeLead('05', 'Deepak Joshi', '+919811112205', 'booked', 'hot', 'walk_in', 88, '15-25L', {
    timeline: 'immediate',
    notes: 'Token paid. Needs agreement draft and payment receipt by tonight.',
  }),
  makeLead('06', 'Manisha Kulkarni', '+919811112206', 'negotiation', 'hot', 'ghost_closer', 78, '40L+', {
    purpose: 'investment',
    notes: 'NRI investor. Wants 2 adjoining plots and WhatsApp follow-up after 8 PM IST.',
  }),
  makeLead('07', 'Vivek Agrawal', '+919811112207', 'lost', 'cold', 'meta_ad', 42, '25-40L', {
    purpose: 'undecided',
    timeline: '6_months+',
  }),
  makeLead('08', 'Farah Khan', '+919811112208', 'qualified', 'hot', 'website', 84, '40L+', {
    notes: 'Looking for park-facing 1500 sqft. Asked if token can be split across 2 transfers.',
  }),
];

export const leadProfiles: LeadProfile[] = [
  {
    leadId: demoLeads[0].id,
    sourceLabel: 'Meta Click-to-WhatsApp Campaign',
    summary: 'High-intent buyer from Indore outskirts. Responded within 4 minutes of ad click.',
    tags: ['Corner plot', 'Self-use', 'Needs brochure'],
    assignedTo: 'Arjun Sales',
    preferredProjectArea: 'Block A corner cluster',
    preferredPlots: ['A-006', 'A-012'],
    nextAction: 'Send brochure + route-map bundle and push for same-week visit.',
    whatsapp: [
      { id: 'wa-01', at: isoDaysFromNow(-1, 10, 30), direction: 'inbound', channel: 'whatsapp', body: 'Brochure bhej do please. Corner plot available hai kya?' },
      { id: 'wa-02', at: isoDaysFromNow(-1, 10, 34), direction: 'outbound', channel: 'whatsapp', body: 'Bilkul sahab. Krishna Greens ka brochure aur latest price sheet bhej raha hoon. Corner options bhi share karta hoon.' },
      { id: 'wa-03', at: isoDaysFromNow(-1, 18, 4), direction: 'inbound', channel: 'whatsapp', body: 'Sunday ko family ke saath site dekh sakte hain?' },
    ],
    activity: [
      { id: 'act-01', at: isoDaysFromNow(-2, 12, 15), title: 'Lead captured', detail: 'Meta campaign कृष्णा Greens — Click-to-WhatsApp May', tone: 'good' },
      { id: 'act-02', at: isoDaysFromNow(-1, 10, 34), title: 'Sales Agent replied', detail: 'Brochure + location pin sent in Hindi and English', tone: 'good' },
      { id: 'act-03', at: isoDaysFromNow(-1, 18, 4), title: 'Visit intent detected', detail: 'Suggested Sunday 11:00 / 16:00 slots', tone: 'neutral' },
    ],
  },
  {
    leadId: demoLeads[2].id,
    sourceLabel: 'Google Search Lead',
    summary: 'Senior IT manager with family decision-makers. High trust in RERA/document clarity.',
    tags: ['Sunday visit', 'Family buyer', 'RERA-first'],
    assignedTo: 'Arjun Sales',
    preferredProjectArea: 'Block A premium frontage',
    preferredPlots: ['A-018', 'A-019'],
    nextAction: 'Confirm visit logistics, send salesperson contact card, and pre-share gate location.',
    whatsapp: [
      { id: 'wa-11', at: isoDaysFromNow(-1, 9, 12), direction: 'outbound', channel: 'whatsapp', body: 'Namaste Sunil ji, aapki Sunday site visit 4:00 PM ke liye provisional hold kar di hai.' },
      { id: 'wa-12', at: isoDaysFromNow(-1, 9, 14), direction: 'inbound', channel: 'whatsapp', body: 'Perfect. Please share exact gate location and RERA number.' },
      { id: 'wa-13', at: isoDaysFromNow(-1, 9, 17), direction: 'outbound', channel: 'whatsapp', body: 'Location pin + RERA certificate snapshot bhej diya hai. Sales manager Arjun aapko call bhi karega.' },
    ],
    activity: [
      { id: 'act-11', at: isoDaysFromNow(-3, 11, 10), title: 'Lead qualified', detail: 'Budget and family decision-maker captured from search inquiry', tone: 'good' },
      { id: 'act-12', at: isoDaysFromNow(-1, 9, 20), title: 'Visit scheduled', detail: 'Sunday 4:00 PM confirmed, reminder queue armed', tone: 'good' },
    ],
  },
  {
    leadId: demoLeads[5].id,
    sourceLabel: 'Ghost Closer NRI Prospect',
    summary: 'NRI investor considering bundle purchase. Needs after-hours responses and ROI framing.',
    tags: ['NRI', '2 plots', 'Negotiation'],
    assignedTo: 'Ritika Closer',
    preferredProjectArea: 'Park-facing plus adjoining 1500 sqft',
    preferredPlots: ['A-015', 'A-016'],
    nextAction: 'Send ROI sheet, adjacency map, and split-token options over WhatsApp.',
    whatsapp: [
      { id: 'wa-21', at: isoDaysFromNow(-1, 20, 10), direction: 'inbound', channel: 'whatsapp', body: 'Can I hold 2 adjacent plots if token is sent tonight?' },
      { id: 'wa-22', at: isoDaysFromNow(-1, 20, 12), direction: 'outbound', channel: 'whatsapp', body: 'Yes ma’am. We can block both for 24 hours against token confirmation. Sharing map and payment options now.' },
    ],
    activity: [
      { id: 'act-21', at: isoDaysFromNow(-4, 14, 15), title: 'Prospect enriched', detail: 'Ghost Closer tagged as NRI investor from Dubai', tone: 'neutral' },
      { id: 'act-22', at: isoDaysFromNow(-1, 20, 13), title: 'Negotiation opened', detail: 'Adjoining plot hold request received', tone: 'alert' },
    ],
  },
];

export const demoSiteVisits: VisitBoardItem[] = [
  {
    id: 'sv-01',
    lead_id: demoLeads[2].id,
    project_id: DEMO_PROJECT_ID,
    lead_name: demoLeads[2].name,
    lead_phone: demoLeads[2].phone,
    project_name: DEMO_PROJECT.name,
    budget_range: demoLeads[2].budget_range,
    scheduled_date: isoDaysFromNow(1, 0, 0).slice(0, 10),
    scheduled_time: '16:00',
    status: 'confirmed',
    feedback: null,
    interest_level: 'very_high',
    follow_up_action: 'Send route map and call 2 hours before visit',
    reminder_sent_at: isoDaysFromNow(0, 20, 0),
    completed_at: null,
    created_at: isoDaysFromNow(-1, 9, 20),
    updated_at: isoDaysFromNow(0, 10, 45),
  },
  {
    id: 'sv-02',
    lead_id: demoLeads[3].id,
    project_id: DEMO_PROJECT_ID,
    lead_name: demoLeads[3].name,
    lead_phone: demoLeads[3].phone,
    project_name: DEMO_PROJECT.name,
    budget_range: demoLeads[3].budget_range,
    scheduled_date: isoDaysFromNow(-1, 0, 0).slice(0, 10),
    scheduled_time: '11:30',
    status: 'completed',
    feedback: 'Liked road width and sample corner inventory. Wants revised payment schedule.',
    interest_level: 'high',
    follow_up_action: 'Share payment plan comparison and call spouse tonight',
    reminder_sent_at: isoDaysFromNow(-2, 18, 0),
    completed_at: isoDaysFromNow(-1, 13, 45),
    created_at: isoDaysFromNow(-3, 11, 30),
    updated_at: isoDaysFromNow(-1, 14, 15),
  },
  {
    id: 'sv-03',
    lead_id: demoLeads[0].id,
    project_id: DEMO_PROJECT_ID,
    lead_name: demoLeads[0].name,
    lead_phone: demoLeads[0].phone,
    project_name: DEMO_PROJECT.name,
    budget_range: demoLeads[0].budget_range,
    scheduled_date: isoDaysFromNow(3, 0, 0).slice(0, 10),
    scheduled_time: '11:00',
    status: 'scheduled',
    feedback: null,
    interest_level: 'high',
    follow_up_action: 'Brochure sent. Need reminder + gate escort assignment.',
    reminder_sent_at: null,
    completed_at: null,
    created_at: isoDaysFromNow(-1, 18, 8),
    updated_at: isoDaysFromNow(-1, 18, 8),
  },
];

function makePlot(index: number, status: PlotStatus, bookedBy?: Lead | null): PlotInventoryItem {
  const plotId = `p0000001-0000-0000-0000-${String(index).padStart(12, '0')}`;
  const areaSqft = index % 3 === 0 ? 1500 : index % 2 === 0 ? 1200 : 1000;
  const total = areaSqft * 2400;
  return {
    id: plotId,
    project_id: DEMO_PROJECT_ID,
    plot_number: `A-${String(index).padStart(3, '0')}`,
    block: 'A',
    area_sqft: areaSqft,
    dimension: areaSqft === 1500 ? '30x50' : areaSqft === 1200 ? '30x40' : '25x40',
    facing: index % 5 === 0 ? 'Corner' : index % 2 === 0 ? 'East' : 'North',
    price_per_sqft: 2400,
    total_price: total,
    status,
    booked_by: bookedBy?.id ?? null,
    token_amount: status === 'token' || status === 'booked' ? 50_000 : null,
    token_date: status === 'token' || status === 'booked' ? isoDaysFromNow(-1, 14, 0) : null,
    created_at: isoDaysFromNow(-30, 10, 0),
    updated_at: isoDaysFromNow(0, 9, 0),
    lead_name: bookedBy?.name ?? null,
    token_due: status === 'token' ? 50_000 : null,
  };
}

export const demoPlots: PlotInventoryItem[] = [
  makePlot(1, 'available'),
  makePlot(2, 'available'),
  makePlot(3, 'available'),
  makePlot(4, 'available'),
  makePlot(5, 'blocked', demoLeads[5]),
  makePlot(6, 'available'),
  makePlot(7, 'available'),
  makePlot(8, 'token', demoLeads[0]),
  makePlot(9, 'available'),
  makePlot(10, 'available'),
  makePlot(11, 'available'),
  makePlot(12, 'available'),
  makePlot(13, 'available'),
  makePlot(14, 'available'),
  makePlot(15, 'blocked', demoLeads[5]),
  makePlot(16, 'blocked', demoLeads[5]),
  makePlot(17, 'available'),
  makePlot(18, 'booked', demoLeads[4]),
];

export const demoBookings: BookingWorkbenchItem[] = [
  {
    id: 'bk-01',
    lead_id: demoLeads[4].id,
    project_id: DEMO_PROJECT_ID,
    plot_id: demoPlots.find((plot) => plot.plot_number === 'A-018')?.id ?? null,
    token_amount: 50_000,
    total_amount: 2_400_000,
    payment_mode: 'upi',
    payment_reference: 'UTR-23051198765',
    upi_payment_link: buildUpiLink({
      pa: DEMO_PROJECT.paymentVpa,
      pn: DEMO_PROJECT.paymentName,
      am: 50_000,
      tn: 'Krishna Greens token A-018',
    }),
    booking_date: isoDaysFromNow(-6, 16, 10),
    status: 'token_paid',
    agreement_url: null,
    registry_url: null,
    notes: 'Receipt sent on WhatsApp. Agreement draft pending.',
    created_at: isoDaysFromNow(-6, 16, 10),
    updated_at: isoDaysFromNow(-1, 12, 30),
    buyer_name: demoLeads[4].name,
    plot_label: 'A-018',
    project_name: DEMO_PROJECT.name,
  },
];

export function leadProfileById(leadId: string) {
  return leadProfiles.find((profile) => profile.leadId === leadId) ?? null;
}

export function leadById(leadId: string) {
  return demoLeads.find((lead) => lead.id === leadId) ?? null;
}

export function plotById(plotId: string | null | undefined) {
  if (!plotId) return null;
  return demoPlots.find((plot) => plot.id === plotId) ?? null;
}

export function availablePlots() {
  return demoPlots.filter((plot) => plot.status === 'available' || plot.status === 'token');
}

