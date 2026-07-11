import { PageHeader } from '@/components/shared/PageHeader';
import { Store, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@supabase/supabase-js';

export const metadata = { title: 'Trials — WhatsAI Assistant' };
export const dynamic = 'force-dynamic';

type TrialRow = {
  id: string;
  business_id: string;
  trial_start: string;
  trial_end: string;
  status: string;
  success_metric_met: boolean;
  businesses: { name: string; phone: string } | null;
};

async function loadTrials(): Promise<TrialRow[]> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? process.env.SUPABASE_URL ?? '';
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return [];

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from('trial_accounts')
    .select('*, businesses(name, phone)')
    .order('trial_start', { ascending: false })
    .limit(50);

  return (data as TrialRow[]) ?? [];
}

function statusBadge(status: string, metricMet: boolean) {
  if (status === 'converted') return <Badge className="bg-emerald-100 text-emerald-800 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Converted</Badge>;
  if (status === 'expired')   return <Badge className="bg-zinc-100 text-zinc-700 border-0 gap-1"><XCircle className="h-3 w-3" />Expired</Badge>;
  return (
    <Badge className={`${metricMet ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} border-0 gap-1`}>
      <Clock className="h-3 w-3" />{metricMet ? 'Active ✓' : 'Active'}
    </Badge>
  );
}

function daysLeft(trialEnd: string) {
  const diff = new Date(trialEnd).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return '—';
  if (days === 0) return 'Today';
  return `${days}d left`;
}

export default async function TrialsPage() {
  const trials = await loadTrials();
  const active    = trials.filter((t) => t.status === 'active').length;
  const converted = trials.filter((t) => t.status === 'converted').length;

  return (
    <>
      <PageHeader
        title="Trials"
        titleHi="ट्रायल्स"
        description="7-day WhatsApp AI receptionist trials. Each trial represents one SMB onboarded."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />New Trial
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Trials', value: active, color: 'text-blue-600' },
          { label: 'Converted',     value: converted, color: 'text-emerald-600' },
          { label: 'Total',         value: trials.length, color: 'text-foreground' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {trials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <Store className="h-10 w-10 opacity-30" />
          <p className="text-sm">No trials yet. Run your first 7-day WhatsApp trial.</p>
          <Button size="sm" className="mt-2"><Plus className="h-4 w-4 mr-2" />Start First Trial</Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Business', 'Phone', 'Started', 'Ends', 'Status', 'Goal Met?'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {trials.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.businesses?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.businesses?.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.trial_start).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">{new Date(t.trial_end).toLocaleDateString('en-IN')}</span>
                    <span className="ml-2 text-xs text-orange-600 font-medium">{daysLeft(t.trial_end)}</span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(t.status, t.success_metric_met)}</td>
                  <td className="px-4 py-3">
                    {t.success_metric_met
                      ? <span className="text-emerald-600 font-medium">✓ Yes</span>
                      : <span className="text-zinc-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
