import { PageHeader } from '@/components/shared/PageHeader';
import { KnowledgeWorkspace } from '@/components/whatsai/KnowledgeWorkspace';

export const dynamic = 'force-dynamic';

export default function KnowledgePage() {
  return <div className="space-y-6"><PageHeader title="Business Knowledge" description="Teach WhatsAI exact, owner-approved answers about your services, prices, policies, and location." /><KnowledgeWorkspace /></div>;
}
