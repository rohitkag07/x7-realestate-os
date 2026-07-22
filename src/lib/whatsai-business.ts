import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveDashboardBusiness(supabase: SupabaseClient, requestedBusinessId?: string | null) {
  const configuredBusinessId = process.env.DEFAULT_BUSINESS_ID || null;
  const configuredBuilderId = process.env.DEFAULT_BUILDER_ID || null;

  if (configuredBusinessId) {
    if (requestedBusinessId && requestedBusinessId !== configuredBusinessId) {
      throw new BusinessContextError('business_context_mismatch', 403);
    }
    return fetchBusiness(supabase, configuredBusinessId);
  }

  if (configuredBuilderId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, builder_id')
      .eq('builder_id', configuredBuilderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new BusinessContextError(error.message, 502);
    if (!data) throw new BusinessContextError('default_business_not_found', 404);
    if (requestedBusinessId && requestedBusinessId !== data.id) {
      throw new BusinessContextError('business_context_mismatch', 403);
    }
    return data;
  }

  if (requestedBusinessId && process.env.NODE_ENV !== 'production') {
    return fetchBusiness(supabase, requestedBusinessId);
  }

  throw new BusinessContextError('Configure DEFAULT_BUSINESS_ID or DEFAULT_BUILDER_ID.', 503);
}

async function fetchBusiness(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, builder_id')
    .eq('id', businessId)
    .maybeSingle();
  if (error) throw new BusinessContextError(error.message, 502);
  if (!data) throw new BusinessContextError('business_not_found', 404);
  return data;
}

export class BusinessContextError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'BusinessContextError';
  }
}
