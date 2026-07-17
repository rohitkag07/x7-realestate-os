import { MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { loadWhatsAiInboxData } from '@/lib/whatsai-data';

export const metadata = { title: 'Leads' };

export default async function LeadsPage() {
  const data = await loadWhatsAiInboxData();

  return (
    <>
      <PageHeader
        title="Lead Pipeline"
        titleHi=""
        description="Every WhatsApp conversation is grouped by its current sales stage."
        actions={<span className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4 text-[#00a884]" />Live WhatsApp pipeline</span>}
      />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{data.source === 'supabase' ? 'Live canonical WhatsAI conversations.' : 'Showing the local demo pipeline until Supabase is available.'}</p>
      <LeadPipeline threads={data.threads} />
    </>
  );
}
