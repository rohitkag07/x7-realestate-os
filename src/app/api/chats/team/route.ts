import { NextResponse } from 'next/server';
import { serviceClientOrNull } from '@/lib/sales-server';

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get('business_id');
  if (!businessId) return NextResponse.json({ ok: false, error: 'business_id is required.' }, { status: 400 });
  const supabase = serviceClientOrNull();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase service client unavailable.' }, { status: 502 });
  const { data, error } = await (supabase.from('business_members') as any).select('user_id, display_name, role').eq('business_id', businessId).eq('active', true).order('role');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, members: data ?? [] });
}
