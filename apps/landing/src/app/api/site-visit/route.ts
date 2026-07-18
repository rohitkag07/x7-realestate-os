import { NextResponse, type NextRequest } from 'next/server';
import { landingSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface SiteVisitPayload {
  name?: string;
  phone?: string;
  email?: string;
  date?: string;
  notes?: string;
  project_id?: string;
  builder_id?: string;
  source?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SiteVisitPayload;
  const { name, phone, email, date, notes, project_id, builder_id, source = 'landing_page' } = body ?? {};
  if (!name || !phone || !project_id || !builder_id) {
    return NextResponse.json({ error: 'name, phone, project_id, builder_id required' }, { status: 400 });
  }
  const sb = landingSupabase();
  const normalized = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
  const { data: lead, error } = await sb.from('leads').insert({
    builder_id, project_id, name, phone: normalized, email: email ?? null, source, notes: notes ?? null,
    lead_stage: date ? 'visit_scheduled' : 'new', temperature: 'warm', lead_score: 60,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (date) {
    await sb.from('site_visits').insert({ lead_id: lead.id, project_id, scheduled_date: date, scheduled_time: '14:00', status: 'scheduled' });
  }
  // Queue a CAPI Lead event for Meta attribution
  await sb.from('capi_events').insert({ builder_id, lead_id: lead.id, event_name: 'Lead', user_data: { phone: normalized, email: email ?? null, country: 'IN' }, custom_data: { source } });

  return NextResponse.json({ lead_id: lead.id, ok: true }, { status: 201 });
}
