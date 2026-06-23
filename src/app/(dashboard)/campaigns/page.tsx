import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { FullFunnelDialog } from '@/components/campaigns/FullFunnelDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { loadCampaignsPageData, marketingReadSourceLabel } from '@/lib/marketing-read';
import { formatINR } from '@/lib/utils';

export const metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const { campaigns, totals, source } = await loadCampaignsPageData();
  return (
    <>
      <PageHeader title="Ad Campaigns" titleHi="ऐड कैम्पेन" description="Meta + Google ads managed by the Ads Agent. Daily budget reallocation enabled." actions={<FullFunnelDialog />} />
      <p className="mb-6 -mt-3 text-xs text-muted-foreground">{marketingReadSourceLabel(source)}</p>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Active Campaigns" value={totals.active} icon={Megaphone} accent="success" />
        <KPICard label="Total Spent" value={formatINR(totals.totalSpent)} icon={Megaphone} accent="primary" />
        <KPICard label="Leads Generated" value={totals.leads} icon={Megaphone} accent="success" />
        <KPICard label="Avg CPL" value={formatINR(totals.avgCpl)} icon={Megaphone} accent="warning" />
      </section>
      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Click 'New Campaign' to provision the full 4-stage funnel." />
      ) : (
        <div className="space-y-3">{campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
      )}
    </>
  );
}
