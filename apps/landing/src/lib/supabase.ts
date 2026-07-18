import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LandingBuilder, LandingPageConfig, LandingProject } from '@/lib/types';

type Table<Row, Insert = Partial<Row>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Partial<Insert> & Record<string, unknown>;
  Relationships: [];
};

interface LeadRow {
  id: string;
  builder_id: string;
  project_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  notes: string | null;
  lead_stage: string;
  temperature: string;
  lead_score: number;
}

interface LeadInsert extends Omit<LeadRow, 'id'> {
  id?: string;
}

interface SiteVisitRow {
  id: string;
  lead_id: string;
  project_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

interface CapiEventRow {
  id: string;
  builder_id: string;
  lead_id: string;
  event_name: string;
  user_data: { phone: string; email: string | null; country: string };
  custom_data: { source: string };
}

interface LandingDatabase {
  public: {
    Tables: {
      builders: Table<LandingBuilder>;
      projects: Table<LandingProject>;
      landing_pages: Table<LandingPageConfig & { project_id: string }>;
      leads: Table<LeadRow, LeadInsert>;
      site_visits: Table<SiteVisitRow, Omit<SiteVisitRow, 'id'> & { id?: string }>;
      capi_events: Table<CapiEventRow, Omit<CapiEventRow, 'id'> & { id?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let client: SupabaseClient<LandingDatabase> | null = null;

export function landingSupabase(): SupabaseClient<LandingDatabase> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env missing');

  client = createClient<LandingDatabase>(url, key, { auth: { persistSession: false } });
  return client;
}
