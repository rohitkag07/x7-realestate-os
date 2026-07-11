import { ChatsInbox } from '@/components/whatsai/ChatsInbox';
import { loadWhatsAiInboxData } from '@/lib/whatsai-data';

export const dynamic = 'force-dynamic';

interface ChatsPageProps { searchParams?: Promise<{ phone?: string }> }

export default async function ChatsPage({ searchParams }: ChatsPageProps) {
  const params = await searchParams;
  const data = await loadWhatsAiInboxData(params?.phone ?? null);
  return <ChatsInbox data={data} />;
}
