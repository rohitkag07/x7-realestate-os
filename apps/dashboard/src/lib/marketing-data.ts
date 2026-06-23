import type { AdCampaign } from '@/types/database';

/**
 * Phase 4 demo dataset — mirrors sales-data.ts / content-data.ts so the
 * marketing views render even when Supabase is offline.
 */
export const DEMO_BUILDER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_PROJECT_ID = '22222222-2222-2222-2222-222222222222';

export interface GhostProspectItem {
  id: string; full_name: string; phone: string | null; email: string | null;
  city: string | null; country: string; is_nri: boolean;
  occupation: string | null; employer: string | null;
  source: string; propensity_score: number | null; status: string;
  last_contacted_at: string | null; created_at: string;
}

export interface GhostFunnel {
  total: number; discovered: number; researched: number;
  contacted: number; engaged: number; converted: number; avg_propensity: number | null;
}

function campaign(i: number, name: string, type: AdCampaign['campaign_type'], budget: number, spent: number, leads: number, status: AdCampaign['status']): AdCampaign {
  return {
    id: `demo-cam-${i}`, project_id: DEMO_PROJECT_ID, builder_id: DEMO_BUILDER_ID, platform: 'meta',
    campaign_name: name, campaign_type: type, objective: null,
    budget_daily: budget, budget_total: null, budget_spent: spent,
    impressions: spent * 80, clicks: leads * 12, leads_generated: leads,
    site_visits_attributed: Math.floor(leads * 0.3), bookings_attributed: Math.floor(leads * 0.04),
    cpl: leads > 0 ? Math.round(spent / leads) : null, cpv: null, ctr: 2.4, status,
    meta_campaign_id: `1234${i}`, meta_adset_id: `5678${i}`, google_campaign_id: null, audience: {},
    start_date: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), end_date: null,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(), updated_at: new Date().toISOString(),
  };
}

export const demoCampaigns: AdCampaign[] = [
  campaign(1, 'Krishna Greens — Click-to-WhatsApp May', 'click_to_whatsapp', 1500, 18750, 127, 'active'),
  campaign(2, 'Awareness — Super Corridor Reel',        'awareness',         800,   9200,   0, 'active'),
  campaign(3, 'Retargeting — Website Visitors',         'retargeting',       500,   4100,  18, 'paused'),
];

export function campaignTotals(campaigns: AdCampaign[]) {
  const active = campaigns.filter((c) => c.status === 'active').length;
  const totalSpent = campaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0);
  const leads = campaigns.reduce((s, c) => s + (c.leads_generated ?? 0), 0);
  return { active, totalSpent, leads, avgCpl: leads > 0 ? Math.round(totalSpent / leads) : 0 };
}

function prospect(id: string, name: string, occ: string, city: string, score: number, status: string, nri = false): GhostProspectItem {
  return {
    id, full_name: name, phone: '+919876543210', email: null, city, country: nri ? 'AE' : 'IN', is_nri: nri,
    occupation: occ, employer: null, source: 'manual', propensity_score: score, status,
    last_contacted_at: status === 'contacted' ? new Date(Date.now() - 864e5).toISOString() : null,
    created_at: new Date().toISOString(),
  };
}

export const demoProspects: GhostProspectItem[] = [
  prospect('gp1', 'Vivek Mehta',   'Doctor',           'Indore', 84, 'researched'),
  prospect('gp2', 'Anjali Kapoor', 'CEO',              'Mumbai', 88, 'contacted'),
  prospect('gp3', 'Rohan Iyer',    'IT Director',      'Pune',   76, 'researched'),
  prospect('gp4', 'Sara Khan',     'Business Owner',   'Indore', 79, 'engaged'),
  prospect('gp5', 'Karan Singh',   'NRI Software Eng', 'Dubai',  72, 'discovered', true),
];

export const demoFunnel: GhostFunnel = {
  total: 248, discovered: 184, researched: 39, contacted: 18, engaged: 5, converted: 2, avg_propensity: 67.5,
};
