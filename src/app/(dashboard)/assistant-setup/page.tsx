import { PageHeader } from '@/components/shared/PageHeader';
import { WhatsAiSetupForm } from '@/components/whatsai/WhatsAiSetupForm';

export const dynamic = 'force-dynamic';

export default function AssistantSetupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsAI Setup"
        titleHi="असिस्टेंट सेटअप"
        description="Business profile, WhatsApp channel, playbook, and first knowledge base for the 7-day assistant trial."
      />
      <WhatsAiSetupForm />
    </div>
  );
}
