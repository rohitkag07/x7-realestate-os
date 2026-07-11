import { PageHeader } from '@/components/shared/PageHeader';
import { WhatsAiSetupForm } from '@/components/whatsai/WhatsAiSetupForm';

export const dynamic = 'force-dynamic';

export default function AssistantSetupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant Setup"
        description="Connect WhatsApp, add your business details, and teach the assistant what to ask."
      />
      <WhatsAiSetupForm />
    </div>
  );
}
