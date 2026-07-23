import { NextResponse } from 'next/server';
import { callSalesAgent, serviceClientOrNull } from '@/lib/sales-server';
import { BusinessContextError, resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase);
    const { id } = await context.params;
    const { data: campaign, error } = await (supabase.from('broadcast_campaigns') as any)
      .select('id, status')
      .eq('id', id)
      .eq('business_id', business.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) return NextResponse.json({ ok: false, error: 'Campaign not found.' }, { status: 404 });
    if (['completed', 'cancelled'].includes(campaign.status)) {
      return NextResponse.json({ ok: false, error: `Campaign is ${campaign.status}.` }, { status: 409 });
    }
    await (supabase.from('broadcast_campaigns') as any).update({ status: 'queued' }).eq('id', id);
    const dispatch = await callSalesAgent('/campaigns/run', { campaign_id: id });
    if (!dispatch) return NextResponse.json({ ok: false, error: 'Sales Agent is unavailable; campaign remains queued.' }, { status: 503 });
    return NextResponse.json({ ok: true, dispatch });
  } catch (error) {
    const status = error instanceof BusinessContextError ? error.status : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'campaign_dispatch_failed' }, { status });
  }
}
