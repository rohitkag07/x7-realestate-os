import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveLegacyBuilderId(
  supabase: SupabaseClient<any>,
  businessId: string,
) {
  const business = await supabase
    .from('businesses')
    .select('builder_id')
    .eq('id', businessId)
    .maybeSingle();
  const configured = String(business.data?.builder_id || '').trim();
  if (configured) return configured;

  const builder = await supabase
    .from('builders')
    .select('id')
    .eq('id', businessId)
    .maybeSingle();
  return builder.data?.id ?? null;
}
