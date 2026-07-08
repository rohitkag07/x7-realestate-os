import { PageHeader } from '@/components/shared/PageHeader';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@supabase/supabase-js';

export const metadata = { title: 'Conversations — X7 WhatsAI' };
export const dynamic = 'force-dynamic';

type ThreadRow = {
  id: string;
  status: string;
  lead_stage: string;
  temperature: string;
  created_at: string;
  updated_at: string;
  conversation_contacts: { name: string | null; phone: string } | null;
  businesses: { name: string } | null;
};

async function loadThreads(): Promise<ThreadRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return [];

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from('conversation_threads')
    .select('*, conversation_contacts(name, phone), businesses(name)')
    .order('updated_at', { ascending: false })
    .limit(100);

  return (data as ThreadRow[]) ?? [];
}

const TEMP_DOT: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-500',
  cold: 'bg-blue-400',
};

const STATUS_COLOR: Record<string, string> = {
  active:        'bg-emerald-100 text-emerald-800',
  bot_paused:    'bg-amber-100 text-amber-800',
  human_takeover:'bg-red-100 text-red-800',
  closed:        'bg-zinc-100 text-zinc-600',
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

export default async function ConversationsPage() {
  const threads = await loadThreads();
  const active  = threads.filter((t) => t.status === 'active').length;
  const hot     = threads.filter((t) => t.temperature === 'hot').length;
  const takeover = threads.filter((t) => t.status === 'human_takeover').length;

  return (
    <>
      <PageHeader
        title="Conversations"
        titleHi="बातचीत"
        description="Every inbound WhatsApp conversation across all businesses — generic layer."
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',         value: active,    color: 'text-emerald-600' },
          { label: 'Hot Leads',      value: hot,       color: 'text-red-600' },
          { label: 'Human Takeover', value: takeover,  color: 'text-orange-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p className="text-sm">No conversations yet. Waiting for first WhatsApp message.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Contact', 'Business', 'Stage', 'Temp', 'Status', 'Last Active'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {threads.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.conversation_contacts?.name ?? 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{t.conversation_contacts?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.businesses?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{t.lead_stage.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${TEMP_DOT[t.temperature] ?? 'bg-zinc-400'}`} />
                    <span className="ml-2 text-xs capitalize">{t.temperature}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_COLOR[t.status] ?? 'bg-zinc-100 text-zinc-700'} border-0 text-xs capitalize`}>
                      {t.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
