import { NextResponse } from 'next/server';
import {
  fetchMetaTemplates,
  normalizeMetaTemplateStatus,
  qualityScoreValue,
  resolveWhatsAppChannel,
} from '@/lib/meta-whatsapp';
import { serviceClientOrNull } from '@/lib/sales-server';
import { BusinessContextError, resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase);
    const channel = await resolveWhatsAppChannel(supabase, business.id);
    const templates = await fetchMetaTemplates(channel.business_account_id);
    const syncedAt = new Date().toISOString();
    const rows = templates.map((template) => ({
      business_id: business.id,
      business_channel_id: channel.id,
      name: template.name,
      language: template.language,
      category: template.category === 'MARKETING' ? 'MARKETING' : 'UTILITY',
      status: normalizeMetaTemplateStatus(template.status),
      components: template.components ?? [],
      meta_template_id: template.id,
      quality_score: qualityScoreValue(template.quality_score),
      rejection_reason: template.rejected_reason ?? null,
      last_synced_at: syncedAt,
    }));
    if (rows.length) {
      const { error } = await (supabase.from('whatsapp_templates') as any)
        .upsert(rows, { onConflict: 'business_id,name,language' });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, synced: rows.length, templates: rows });
  } catch (error) {
    const status = error instanceof BusinessContextError ? error.status : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'template_sync_failed' }, { status });
  }
}
