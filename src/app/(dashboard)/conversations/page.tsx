import { MessageCircle, Sparkles, TimerReset, UserRoundCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { WhatsAiInbox } from '@/components/whatsai/WhatsAiInbox';
import { loadWhatsAiInboxData } from '@/lib/whatsai-data';

export const dynamic = 'force-dynamic';

interface ConversationsPageProps {
  searchParams?: Promise<{
    phone?: string;
  }>;
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const data = await loadWhatsAiInboxData(resolvedSearchParams?.phone ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsAI Inbox"
        titleHi="व्हाट्सऐ इनबॉक्स"
        description="WATI-style shared inbox with AI lead qualification, manual takeover, and owner-summary controls."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Conversations"
          value={String(data.summary.metrics.totalThreads)}
          icon={MessageCircle}
          accent="primary"
        />
        <KPICard
          label="Hot Leads"
          value={String(data.summary.metrics.hotThreads)}
          icon={Sparkles}
          accent="success"
        />
        <KPICard
          label="Unread"
          value={String(data.summary.metrics.unreadThreads)}
          icon={TimerReset}
          accent={data.summary.metrics.unreadThreads > 0 ? 'warning' : 'success'}
        />
        <KPICard
          label="Handoffs"
          value={String(data.summary.metrics.humanHandoffs)}
          icon={UserRoundCheck}
          accent={data.summary.metrics.humanHandoffs > 0 ? 'warning' : 'success'}
        />
      </div>

      <WhatsAiInbox data={data} />
    </div>
  );
}
