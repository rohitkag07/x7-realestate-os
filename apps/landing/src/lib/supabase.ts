import { createClient as create } from '@supabase/supabase-js';
let _c: ReturnType<typeof create> | null = null;
export function landingSupabase() {
  if (_c) return _c;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  _c = create(url, key, { auth: { persistSession: false } });
  return _c;
}
