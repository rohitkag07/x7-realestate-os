import { PageHeader } from '@/components/shared/PageHeader';
import { Handshake, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@supabase/supabase-js';

export const metadata = { title: 'Handoffs — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

type HandoffRow = {
  id: string;
  reason: string;
  priority: string;
  status: string;
  summary: string | null;
  created_at: string;
  businesses: { name: string; phone: string } | null;
  conversation_threads: {
    conversation_contacts: { name: string | null; phone: string } | null;
  } | null;
};

async function loadHandoffs(): Promise<HandoffRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return [];

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from('handoff_events')
    .select('*, businesses(name, phone), conversation_threads(conversation_contacts(name, phone))')
    .order('created_at', { ascending: false })
    .limit(100);

  return (data as HandoffRow[]) ?? [];
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high:     'bg-orange-100 text-orange-800',
  medium:   'bg-amber-100 text-amber-800',
  low:      'bg-zinc-100 text-zinc-700',
};

const STATUS_COLOR: Record<string, string> = {
  pending:      'bg-red-100 text-red-800',
  acknowledged: 'bg-amber-100 text-amber-800',
  resolved:     'bg-emerald-100 text-emerald-800',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function HandoffsPage() {
  const handoffs  = await loadHandoffs();
  const pending   = handoffs.filter((h) => h.status === 'pending').length;
  const critical  = handoffs.filter((h) => h.priority === 'critical').length;
  const resolved  = handoffs.filter((h) => h.status === 'resolved').length;

  return (
    <>
      <PageHeader
        title="Handoffs"
        titleHi="हैंडऑफ"
        description="Hot leads and confused conversations escalated to the business owner."
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending',  value: pending,  color: 'text-red-600' },
          { label: 'Critical', value: critical, color: 'text-orange-600' },
          { label: 'Resolved', value: resolved, color: 'text-emerald-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {handoffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <Handshake className="h-10 w-10 opacity-30" />
          <p className="text-sm">No handoffs yet. When a hot lead needs owner attention, it shows here.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Contact', 'Business', 'Reason', 'Priority', 'Status', 'Summary', 'When'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {handoffs.map((h) => {
                const contact = h.conversation_threads?.conversation_contacts;
                return (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{contact?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{contact?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{h.businesses?.name ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground text-xs">{h.reason}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${PRIORITY_COLOR[h.priority] ?? 'bg-zinc-100 text-zinc-700'} border-0 text-xs flex items-center gap-1 w-fit`}>
                        {h.priority === 'critical' && <AlertTriangle className="h-3 w-3" />}
                        {h.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_COLOR[h.status] ?? 'bg-zinc-100 text-zinc-700'} border-0 text-xs capitalize`}>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-xs text-muted-foreground">{h.summary ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(h.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
