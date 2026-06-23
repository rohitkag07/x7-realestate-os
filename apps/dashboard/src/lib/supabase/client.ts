import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Browser-side Supabase client (RLS-aware via anon key).
 * Use inside Client Components, hooks, and event handlers.
 */
export function createClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '[supabase/client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy apps/dashboard/.env.local.example → .env.local and fill in your Supabase keys.',
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
