import { NextResponse } from 'next/server';
import { createBroadcastSchema } from '@/lib/broadcast-schema';
import { callSalesAgent, serviceClientOrNull } from '@/lib/sales-server';
import { BusinessContextError, resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase, new URL(request.url).searchParams.get('business_id'));
    const [templatesResult, campaignsResult] = await Promise.all([
      (supabase.from('whatsapp_templates') as any)
        .select('*')
        .eq('business_id', business.id)
        .order('updated_at', { ascending: false }),
      (supabase.from('broadcast_campaigns') as any)
        .select('*, whatsapp_templates(name, language, category, status)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (templatesResult.error) throw new Error(templatesResult.error.message);
    if (campaignsResult.error) throw new Error(campaignsResult.error.message);
    return NextResponse.json({
      ok: true,
      business,
      templates: templatesResult.data ?? [],
      campaigns: campaignsResult.data ?? [],
      totals: aggregateCampaigns(campaignsResult.data ?? []),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = createBroadcastSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });

  try {
    const business = await resolveDashboardBusiness(supabase);
    const { data: template, error: templateError } = await (supabase.from('whatsapp_templates') as any)
      .select('*')
      .eq('id', parsed.data.template_id)
      .eq('business_id', business.id)
      .eq('status', 'APPROVED')
      .maybeSingle();
    if (templateError) throw new Error(templateError.message);
    if (!template) return NextResponse.json({ ok: false, error: 'Only approved templates can be broadcast.' }, { status: 409 });

    const contacts = await resolveAudience(supabase, business.id, parsed.data.audience_type, parsed.data.audience_filter);
    if (!contacts.length) return NextResponse.json({ ok: false, error: 'No contacts match this audience.' }, { status: 409 });

    const initialStatus = parsed.data.send_now ? 'queued' : parsed.data.scheduled_at ? 'scheduled' : 'draft';
    const { data: campaign, error: campaignError } = await (supabase.from('broadcast_campaigns') as any)
      .insert({
        business_id: business.id,
        template_id: template.id,
        name: parsed.data.name,
        audience_type: parsed.data.audience_type,
        audience_filter: parsed.data.audience_filter,
        variable_mapping: parsed.data.variable_mapping,
        status: initialStatus,
        scheduled_at: parsed.data.scheduled_at ?? null,
        total_recipients: contacts.length,
      })
      .select()
      .single();
    if (campaignError || !campaign) throw new Error(campaignError?.message ?? 'Campaign creation failed.');

    const recipients = contacts.map((contact: any) => ({
      campaign_id: campaign.id,
      business_id: business.id,
      contact_id: contact.id,
      phone: contact.phone,
      contact_name: contact.name || contact.phone,
      variables: {
        contact_name: contact.name || 'Customer',
        business_name: business.name,
        phone: contact.phone,
      },
    }));
    const { error: recipientError } = await (supabase.from('broadcast_recipients') as any).insert(recipients);
    if (recipientError) {
      await (supabase.from('broadcast_campaigns') as any).delete().eq('id', campaign.id);
      throw new Error(recipientError.message);
    }

    let dispatch = null;
    if (parsed.data.send_now) {
      dispatch = await callSalesAgent('/campaigns/run', { campaign_id: campaign.id });
    }
    return NextResponse.json({ ok: true, campaign, recipient_count: recipients.length, dispatch }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

async function resolveAudience(
  supabase: any,
  businessId: string,
  audienceType: 'all_contacts' | 'stage' | 'category' | 'selected_contacts',
  filter: { stages?: string[]; category?: string; contact_ids?: string[] },
) {
  let query = supabase
    .from('conversation_contacts')
    .select('id, name, phone, stage, tags')
    .eq('business_id', businessId)
    .not('phone', 'is', null);
  if (audienceType === 'stage') {
    if (!filter.stages?.length) return [];
    query = query.in('stage', filter.stages);
  }
  if (audienceType === 'selected_contacts') {
    if (!filter.contact_ids?.length) return [];
    query = query.in('id', filter.contact_ids);
  }
  if (audienceType === 'category') {
    const { data: business } = await supabase.from('businesses').select('category').eq('id', businessId).maybeSingle();
    if (!business || !filter.category || business.category !== filter.category) return [];
  }
  const { data, error } = await query.order('last_message_at', { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

function aggregateCampaigns(campaigns: any[]) {
  const totals = campaigns.reduce((acc, campaign) => ({
    sent: acc.sent + Number(campaign.sent_count || 0),
    delivered: acc.delivered + Number(campaign.delivered_count || 0),
    read: acc.read + Number(campaign.read_count || 0),
    replied: acc.replied + Number(campaign.replied_count || 0),
    failed: acc.failed + Number(campaign.failed_count || 0),
  }), { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 });
  return {
    ...totals,
    delivery_rate: totals.sent ? Math.round((totals.delivered / totals.sent) * 100) : 0,
    read_rate: totals.sent ? Math.round((totals.read / totals.sent) * 100) : 0,
    reply_rate: totals.sent ? Math.round((totals.replied / totals.sent) * 100) : 0,
  };
}

function errorResponse(error: unknown) {
  const status = error instanceof BusinessContextError ? error.status : 500;
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'broadcast_request_failed' }, { status });
}
