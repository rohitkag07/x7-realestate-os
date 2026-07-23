import { NextResponse } from 'next/server';
import { createTemplateSchema } from '@/lib/broadcast-schema';
import { createMetaTemplate, normalizeMetaTemplateStatus, resolveWhatsAppChannel } from '@/lib/meta-whatsapp';
import { serviceClientOrNull } from '@/lib/sales-server';
import { BusinessContextError, resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase, new URL(request.url).searchParams.get('business_id'));
    const { data, error } = await (supabase.from('whatsapp_templates') as any)
      .select('*')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, business, templates: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = createTemplateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });

  try {
    const business = await resolveDashboardBusiness(supabase);
    const channel = await resolveWhatsAppChannel(supabase, business.id);
    const meta = await createMetaTemplate(channel.business_account_id, parsed.data);
    const { data, error } = await (supabase.from('whatsapp_templates') as any)
      .upsert({
        business_id: business.id,
        business_channel_id: channel.id,
        name: parsed.data.name,
        language: parsed.data.language,
        category: parsed.data.category,
        status: normalizeMetaTemplateStatus(meta.status),
        components: parsed.data.components,
        meta_template_id: meta.id ?? null,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'business_id,name,language' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, template: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const status = error instanceof BusinessContextError ? error.status : 500;
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'template_request_failed' }, { status });
}
