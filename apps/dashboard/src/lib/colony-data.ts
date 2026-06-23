import type { Amenity, AmenityBooking, Resident, Complaint, Visitor } from '@/types/database';

/**
 * Phase 5 demo dataset + view types — mirrors sales-data / content-data /
 * marketing-data so colony views render even when Supabase is offline.
 */
export const DEMO_PROJECT_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_BUILDER_ID = '11111111-1111-1111-1111-111111111111';

export interface ColonyKpis {
  residents: number;
  open_complaints: number;
  pending_visitors: number;
  this_month_collected: number;
  this_month_pending: number;
  collection_rate: number | null;
}

export interface NoticeItem {
  id: string; title: string; body: string | null; body_hindi: string | null;
  category: string; target: string; status: string;
  recipient_count: number; delivered_count: number; created_at: string;
}

export interface AmenityBookingView extends AmenityBooking {
  amenity_name: string;
  resident_name: string;
}

export const demoResidents: Resident[] = [
  resident('demo-res-1', 'Amit Khandelwal', '+919811113301', 'amit@example.com', 'owner'),
  resident('demo-res-2', 'Sneha Iyer', '+919811113302', 'sneha@example.com', 'owner'),
  resident('demo-res-3', 'Vivek Patil', '+919811113303', null, 'tenant'),
];

export const demoComplaints: Complaint[] = [
  complaint('demo-c-1', 'water', 'open', 'high', 'Pani 2 din se nahi aa raha A-018 mein.'),
  complaint('demo-c-2', 'electrical', 'in_progress', 'medium', 'Street light kharab hai Block A gate ke paas.'),
  complaint('demo-c-3', 'cleanliness', 'in_progress', 'low', 'Common area me kachra padaa hai 3 din se.'),
  complaint('demo-c-4', 'security', 'resolved', 'critical', 'Stray dog gate pe — guard ko inform kiya.'),
];

export const demoVisitors: Visitor[] = [
  visitor('demo-v-1', 'Ramesh — Electrician', 'service', 'approved'),
  visitor('demo-v-2', 'Suresh — Delivery', 'delivery', 'pending'),
  visitor('demo-v-3', 'Vikas Tiwari', 'guest', 'approved'),
];

export const demoNotices: NoticeItem[] = [
  { id: 'demo-n-1', title: 'Water tank cleaning Sunday 8 AM', body: 'Tank cleaning scheduled.', body_hindi: 'Sunday subah 8 baje water tank cleaning.', category: 'maintenance', target: 'all', status: 'sent', recipient_count: 12, delivered_count: 12, created_at: new Date(Date.now() - 864e5).toISOString() },
  { id: 'demo-n-2', title: 'AGM scheduled for next Saturday', body: 'Annual general meeting.', body_hindi: 'Agle Saturday AGM.', category: 'event', target: 'owners', status: 'draft', recipient_count: 0, delivered_count: 0, created_at: new Date().toISOString() },
];

export const demoAmenities: Amenity[] = [
  amenity('demo-a-1', 'Clubhouse', 'clubhouse', 80, 1200, '06:00', '22:00'),
  amenity('demo-a-2', 'Tennis Court', 'court', 8, 350, '06:00', '21:00'),
  amenity('demo-a-3', 'Guest Suite', 'guest_room', 4, 1800, '00:00', '23:59'),
];

export const demoAmenityBookings: AmenityBookingView[] = [
  amenityBooking('demo-ab-1', 'demo-a-1', 'demo-res-1', 'Clubhouse', 'Amit Khandelwal', 0, 'confirmed'),
  amenityBooking('demo-ab-2', 'demo-a-2', 'demo-res-2', 'Tennis Court', 'Sneha Iyer', 350, 'confirmed'),
  amenityBooking('demo-ab-3', 'demo-a-3', 'demo-res-3', 'Guest Suite', 'Vivek Patil', 1800, 'completed'),
];

export const demoColonyKpis: ColonyKpis = {
  residents: 12, open_complaints: 3, pending_visitors: 1,
  this_month_collected: 27_500, this_month_pending: 5_000, collection_rate: 84.6,
};

export function colonyKpisFrom(residents: Resident[], complaints: Complaint[], visitors: Visitor[]): ColonyKpis {
  return {
    residents: residents.filter((r) => r.status !== 'vacant').length,
    open_complaints: complaints.filter((c) => ['open', 'in_progress', 'reopened'].includes(c.status)).length,
    pending_visitors: visitors.filter((v) => v.approval_status === 'pending').length,
    this_month_collected: demoColonyKpis.this_month_collected,
    this_month_pending: demoColonyKpis.this_month_pending,
    collection_rate: demoColonyKpis.collection_rate,
  };
}

function resident(id: string, name: string, phone: string, email: string | null, status: Resident['status']): Resident {
  return {
    id, project_id: DEMO_PROJECT_ID, plot_id: null, name, phone, email, alt_phone: null,
    family_members: [], vehicles: [], move_in_date: new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10),
    move_out_date: null, status, emergency_contact: {}, documents: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}
function complaint(id: string, cat: Complaint['category'], status: Complaint['status'], priority: Complaint['priority'], desc: string): Complaint {
  return {
    id, project_id: DEMO_PROJECT_ID, resident_id: 'demo-res-1', category: cat, description: desc,
    photo_url: null, attachments: [], priority, status, assigned_to: null, resolution_notes: null,
    sla_breached: false, resolved_at: null, closed_at: null,
    created_at: new Date(Date.now() - Math.random() * 5 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  };
}
function visitor(id: string, name: string, type: Visitor['visitor_type'], status: Visitor['approval_status']): Visitor {
  return {
    id, project_id: DEMO_PROJECT_ID, resident_id: 'demo-res-1', visitor_name: name, visitor_phone: '+919876500000',
    purpose: type === 'delivery' ? 'Amazon delivery' : 'Guest visit', vehicle_number: type === 'delivery' ? 'MP-09-AB-1234' : null,
    visitor_type: type, photo_url: null, entry_time: new Date(Date.now() - 3600_000).toISOString(), exit_time: null,
    approval_status: status, approved_by: status === 'approved' ? 'Resident' : null, approval_method: status === 'approved' ? 'whatsapp' : null,
    notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

function amenity(id: string, name: string, kind: Amenity['kind'], capacity: number, hourlyRate: number, openTime: string, closeTime: string): Amenity {
  return {
    id,
    project_id: DEMO_PROJECT_ID,
    name,
    kind,
    capacity,
    hourly_rate: hourlyRate,
    daily_rate: null,
    open_time: openTime,
    close_time: closeTime,
    rules: 'Advance booking required. Keep the space clean after use.',
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function amenityBooking(
  id: string,
  amenityId: string,
  residentId: string,
  amenityName: string,
  residentName: string,
  fee: number,
  status: AmenityBooking['status'],
): AmenityBookingView {
  const start = fee > 1000 ? '12:00' : '18:00';
  const end = fee > 1000 ? '10:00' : '20:00';
  return {
    id,
    amenity_id: amenityId,
    resident_id: residentId,
    project_id: DEMO_PROJECT_ID,
    booking_date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
    start_time: start,
    end_time: end,
    guests: fee > 1000 ? 3 : 6,
    fee,
    paid: fee === 0,
    upi_payment_link: fee > 0 ? 'upi://pay?pa=x7demo@upi&pn=X7%20Colony&am=350.00&cu=INR' : null,
    status,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    amenity_name: amenityName,
    resident_name: residentName,
  };
}
