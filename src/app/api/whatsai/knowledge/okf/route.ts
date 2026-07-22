import { NextResponse } from 'next/server';
import { knowledgeItemsInputSchema } from '@/lib/knowledge-schema';
import { buildOkfBundle, parseOkfBundle } from '@/lib/okf';
import { serviceClientOrNull } from '@/lib/sales-server';
import { resolveDashboardBusiness } from '@/lib/whatsai-business';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  try {
    const business = await resolveDashboardBusiness(supabase, new URL(request.url).searchParams.get('business_id'));
    const { data, error } = await (supabase.from('assistant_knowledge_items') as any)
      .select('*')
      .eq('business_id', business.id)
      .neq('status', 'archived')
      .order('okf_slug');
    if (error) throw new Error(error.message);
    const body = JSON.stringify(buildOkfBundle({ id: business.id, name: business.name }, data ?? []), null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="whatsai-okf-bundle.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'okf_export_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const items = knowledgeItemsInputSchema.parse(parseOkfBundle(await request.json()));
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'okf_import_failed' }, { status: 400 });
  }
}
