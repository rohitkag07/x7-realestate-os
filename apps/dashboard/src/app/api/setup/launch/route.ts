import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const faqSchema = z.object({ question: z.string(), answer: z.string() });
const schema = z.object({
  businessName: z.string().min(2),
  category: z.enum(['real_estate', 'clinic', 'coaching', 'gym', 'local_service']),
  city: z.string().min(1),
  ownerName: z.string().min(1),
  ownerPhone: z.string().min(8),
  whatsappNumber: z.string().min(8),
  hoursStart: z.string().min(1),
  hoursEnd: z.string().min(1),
  welcomeMessage: z.string().min(1),
  services: z.array(z.string()).default([]),
  pricingRange: z.string().optional(),
  faqs: z.array(faqSchema).default([]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid setup payload' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }

  const payload = parsed.data;
  const business = await (supabase.from('businesses') as any)
    .insert({
      name: payload.businessName,
      phone: payload.ownerPhone,
      email: null,
      status: 'trial',
      plan: 'starter',
    })
    .select('id')
    .single();

  if (business.error) {
    return NextResponse.json({ ok: false, error: business.error.message }, { status: 500 });
  }

  const businessId = business.data.id;
  const metadata = {
    owner_name: payload.ownerName,
    owner_phone: payload.ownerPhone,
    whatsapp_number: payload.whatsappNumber,
    business_hours: { days: 'Mon-Sun', start: payload.hoursStart, end: payload.hoursEnd },
    welcome_message: payload.welcomeMessage,
    services: payload.services,
    pricing_range: payload.pricingRange ?? '',
    faqs: payload.faqs.filter((faq) => faq.question || faq.answer),
  };

  const [profile, channel] = await Promise.all([
    (supabase.from('business_profiles') as any).insert({
      business_id: businessId,
      vertical: payload.category,
      company_name: payload.businessName,
      city: payload.city,
      metadata,
    }),
    (supabase.from('business_channels') as any).insert({
      business_id: businessId,
      provider: 'meta_whatsapp',
      channel_id: payload.whatsappNumber.replace(/\D/g, ''),
      channel_phone: payload.whatsappNumber,
      config: { welcome_message: payload.welcomeMessage, business_hours: metadata.business_hours },
      is_active: true,
    }),
  ]);

  if (profile.error || channel.error) {
    return NextResponse.json({ ok: false, error: profile.error?.message ?? channel.error?.message }, { status: 500 });
  }

  await (supabase as any).rpc('seed_setup_checklist', { p_business_id: businessId });
  return NextResponse.json({ ok: true, business_id: businessId });
}
