import { NextResponse } from 'next/server';
import { z } from 'zod';
import { knowledgeItemsInputSchema, normalizeKnowledgeKeywords, slugifyKnowledgeTitle } from '@/lib/knowledge-schema';
import { serviceClientOrNull } from '@/lib/sales-server';
import { BusinessContextError, resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const saveSchema = z.object({
  business_id: z.string().uuid().optional().nullable(),
  playbook_id: z.string().uuid().optional().nullable(),
  items: knowledgeItemsInputSchema,
});

export async function GET(request: Request) {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const url = new URL(request.url);
    const business = await resolveDashboardBusiness(supabase, url.searchParams.get('business_id'));
    const { data: playbook, error: playbookError } = await (supabase.from('assistant_playbooks') as any)
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (playbookError) throw new Error(playbookError.message);

    const { data, error } = await (supabase.from('assistant_knowledge_items') as any)
      .select('*')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, business, playbook, items: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });

  try {
    const business = await resolveDashboardBusiness(supabase, parsed.data.business_id);
    const playbookId = await resolvePlaybookId(supabase, business.id, parsed.data.playbook_id);
    const saved = [];
    for (const [index, item] of parsed.data.items.entries()) {
      const okfSlug = item.okf_slug || `${slugifyKnowledgeTitle(item.title)}-${index + 1}`;
      const values = {
        business_id: business.id,
        playbook_id: playbookId,
        type: item.kind,
        title: item.title,
        question: item.question || null,
        content: item.content,
        keywords: normalizeKnowledgeKeywords(item.keywords),
        locale: item.locale,
        status: item.status,
        okf_slug: okfSlug,
        source_type: item.source_type,
        source_url: item.source_url || null,
        media_url: item.media_url || null,
        metadata: item.metadata,
        is_active: item.status === 'published',
        published_at: item.status === 'published' ? new Date().toISOString() : null,
        last_reviewed_at: new Date().toISOString(),
      };
      const query = item.id
        ? (supabase.from('assistant_knowledge_items') as any).update(values).eq('id', item.id).eq('business_id', business.id)
        : (supabase.from('assistant_knowledge_items') as any).upsert(values, { onConflict: 'business_id,okf_slug' });
      const { data, error } = await query.select().single();
      if (error) throw new Error(error.message);
      saved.push(data);
    }
    return NextResponse.json({ ok: true, business, playbook_id: playbookId, items: saved });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const parsed = z.object({ business_id: z.string().uuid().optional().nullable(), id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase, parsed.data.business_id);
    const { error } = await (supabase.from('assistant_knowledge_items') as any)
      .delete()
      .eq('id', parsed.data.id)
      .eq('business_id', business.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function resolvePlaybookId(supabase: any, businessId: string, requestedPlaybookId?: string | null) {
  let query = supabase.from('assistant_playbooks').select('id').eq('business_id', businessId).eq('is_active', true);
  query = requestedPlaybookId ? query.eq('id', requestedPlaybookId) : query.order('created_at', { ascending: false }).limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new BusinessContextError('active_playbook_not_found', 404);
  return data.id as string;
}

function errorResponse(error: unknown) {
  const status = error instanceof BusinessContextError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'knowledge_request_failed';
  return NextResponse.json({ ok: false, error: message }, { status });
}
