import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClientOrNull } from '@/lib/sales-server';
import { persistLeadToAppointmentFlow } from '@/lib/whatsai-lead-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  business_id: z.string().optional().nullable(),
  builder_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  business_channel_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  thread_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  phone: z.string().min(8),
  name: z.string().optional().nullable(),
  source: z.enum(['meta_ad', 'google_ad', 'website', 'whatsapp', 'referral', 'walk_in', 'ghost_closer', 'telegram', 'manual']).default('whatsapp'),
  body: z.string().optional().nullable(),
  meta_lead_id: z.string().optional().nullable(),
  wa_message_id: z.string().optional().nullable(),
  appointment_at: z.string().datetime().optional().nullable(),
  appointment_type: z.enum(['site_visit', 'clinic_visit', 'demo', 'callback', 'other']).optional().default('site_visit'),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = serviceClientOrNull();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  }

  const payload = parsed.data;
  const result = await persistLeadToAppointmentFlow(supabase, {
    businessId: payload.business_id,
    builderId: payload.builder_id ?? process.env.DEFAULT_BUILDER_ID ?? null,
    projectId: payload.project_id ?? process.env.DEFAULT_PROJECT_ID ?? null,
    businessChannelId: payload.business_channel_id,
    contactId: payload.contact_id,
    threadId: payload.thread_id,
    leadId: payload.lead_id,
    phone: payload.phone,
    name: payload.name,
    source: payload.source,
    body: payload.body,
    metaLeadId: payload.meta_lead_id,
    waMessageId: payload.wa_message_id,
    appointmentAt: payload.appointment_at,
    appointmentType: payload.appointment_type,
  });

  return NextResponse.json({ ok: true, ...result });
}

