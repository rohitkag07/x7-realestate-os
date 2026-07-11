import { DashboardHome } from '@/components/whatsai/DashboardHome';
import { loadWhatsAiInboxData } from '@/lib/whatsai-data';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await loadWhatsAiInboxData();
  return <DashboardHome data={data} />;
}
