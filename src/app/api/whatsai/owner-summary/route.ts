import { NextResponse } from 'next/server';
import { buildOwnerSummaryText, loadWhatsAiInboxData } from '@/lib/whatsai-data';
import { serviceClientOrNull } from '@/lib/sales-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const data = await loadWhatsAiInboxData();
  const body = buildOwnerSummaryText(data);
  const business = data.summary.business;
  const builderId = data.selectedThread?.builderId ?? null;
  const supabase = serviceClientOrNull();
  let row = null;

  if (supabase) {
    const inserted = await (supabase.from('daily_owner_summaries') as any)
      .upsert({
        business_id: business?.id ?? null,
        builder_id: builderId,
        summary_date: new Date().toISOString().slice(0, 10),
        owner_phone: null,
        metrics: data.summary.metrics,
        body,
        status: 'draft',
      }, { onConflict: 'business_id,summary_date' })
      .select()
      .single();
    row = inserted.data ?? null;

    if (builderId) {
      await (supabase.from('agent_runs') as any).insert({
        builder_id: builderId,
        agent: 'whatsai-assistant',
        action: 'owner-summary-draft',
        input: { business_id: business?.id ?? null },
        output: { body, metrics: data.summary.metrics, summary_id: row?.id ?? null },
        status: 'success',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: body,
    row,
    metrics: data.summary.metrics,
  });
}
