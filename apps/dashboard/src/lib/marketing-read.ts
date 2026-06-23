import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { serviceClientOrNull } from '@/lib/marketing-server';
import {
  demoCampaigns, campaignTotals, demoProspects, demoFunnel,
  type GhostProspectItem, type GhostFunnel,
} from '@/lib/marketing-data';
import type { AdCampaign } from '@/types/database';

export type MarketingReadSource = 'supabase' | 'demo';

export function marketingReadSourceLabel(source: MarketingReadSource) {
  return source === 'supabase'
    ? 'Live Supabase records loaded for this Phase 4 marketing view.'
    : 'Supabase unavailable, so the Phase 4 fallback demo dataset is being shown.';
}

function getReadClientOrNull(): any {
  try {
    return createClient();
  } catch {
    return serviceClientOrNull();
  }
}

export async function loadCampaignsPageData(): Promise<{
  campaigns: AdCampaign[];
  totals: ReturnType<typeof campaignTotals>;
  source: MarketingReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) return { campaigns: demoCampaigns, totals: campaignTotals(demoCampaigns), source: 'demo' };

  const result = await (client.from('ad_campaigns') as any).select('*').order('created_at', { ascending: false }).limit(120);
  if (result.error) return { campaigns: demoCampaigns, totals: campaignTotals(demoCampaigns), source: 'demo' };

  const campaigns = (result.data ?? []) as AdCampaign[];
  return { campaigns, totals: campaignTotals(campaigns), source: 'supabase' };
}

export async function loadGhostCloserPageData(): Promise<{
  prospects: GhostProspectItem[];
  funnel: GhostFunnel;
  source: MarketingReadSource;
}> {
  const client = getReadClientOrNull();
  if (!client) return { prospects: demoProspects, funnel: demoFunnel, source: 'demo' };

  const [prospectsResult, funnelResult] = await Promise.all([
    (client.from('ghost_closer_prospects') as any).select('*').order('propensity_score', { ascending: false }).limit(100),
    (client.from('v_ghost_closer_funnel') as any).select('*').maybeSingle(),
  ]);

  if (prospectsResult.error) return { prospects: demoProspects, funnel: demoFunnel, source: 'demo' };

  return {
    prospects: (prospectsResult.data ?? []) as GhostProspectItem[],
    funnel: (funnelResult.data as GhostFunnel) ?? { total: 0, discovered: 0, researched: 0, contacted: 0, engaged: 0, converted: 0, avg_propensity: null },
    source: 'supabase',
  };
}
