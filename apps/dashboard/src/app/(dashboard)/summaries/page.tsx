import { PageHeader } from '@/components/shared/PageHeader';
import { Bell } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export const metadata = { title: 'Daily Summary — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

type SummaryRow = {
  id: string;
  date: string;
  summary_text: string;
  metrics: Record<string, number | string>;
  delivered_at: string | null;
  businesses: { name: string; phone: string } | null;
};

async function loadSummaries(): Promise<SummaryRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return [];

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from('daily_owner_summaries')
    .select('*, businesses(name, phone)')
    .order('date', { ascending: false })
    .limit(50);

  return (data as SummaryRow[]) ?? [];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function SummariesPage() {
  const summaries = await loadSummaries();
  const today = new Date().toISOString().split('T')[0];
  const todayCount = summaries.filter((s) => s.date === today).length;
  const delivered  = summaries.filter((s) => s.delivered_at).length;

  return (
    <>
      <PageHeader
        title="Daily Summary"
        titleHi="डेली समरी"
        description="Hot-lead digest and action items delivered to each business owner every evening."
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Today's Summaries", value: todayCount,        color: 'text-blue-600' },
          { label: 'Delivered',         value: delivered,         color: 'text-emerald-600' },
          { label: 'Total',             value: summaries.length,  color: 'text-foreground' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <Bell className="h-10 w-10 opacity-30" />
          <p className="text-sm">No daily summaries yet. They generate automatically each evening.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{s.businesses?.name ?? 'Unknown Business'}</span>
                    <span className="text-xs text-muted-foreground">{s.businesses?.phone}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(s.date)}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.delivered_at ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                  {s.delivered_at ? '✓ Delivered' : 'Not sent'}
                </span>
              </div>

              <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.summary_text}</p>

              {s.metrics && Object.keys(s.metrics).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {Object.entries(s.metrics).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1">
                      <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-semibold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
