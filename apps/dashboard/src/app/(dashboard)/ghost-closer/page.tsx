import { Zap, Users, MessageCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { HuntButton } from '@/components/ghost-closer/HuntButton';
import { ProspectsTable } from '@/components/ghost-closer/ProspectsTable';
import { loadGhostCloserPageData, marketingReadSourceLabel } from '@/lib/marketing-read';

export const metadata = { title: 'Ghost Closer' };

export default async function GhostCloserPage() {
  const { prospects, funnel, source } = await loadGhostCloserPageData();
  return (
    <>
      <PageHeader title="Ghost Closer" titleHi="आउटबाउंड हंटिंग" description="Nightly outbound hunter: HNI prospects → propensity scoring → personalized Hindi outreach." actions={<HuntButton />} />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{marketingReadSourceLabel(source)}</p>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KPICard label="Total Prospects" value={funnel.total} icon={Users} accent="primary" />
        <KPICard label="Researched" value={funnel.researched} icon={TrendingUp} accent="primary" />
        <KPICard label="Contacted" value={funnel.contacted} icon={MessageCircle} accent="success" />
        <KPICard label="Engaged" value={funnel.engaged} icon={Zap} accent="warning" />
        <KPICard label="Converted" value={funnel.converted} icon={CheckCircle2} accent="success" />
      </section>
      <ProspectsTable prospects={prospects} />
    </>
  );
}
