import { PageHeader } from '@/components/shared/PageHeader';
import { SetupWizardClient } from '@/components/setup/SetupWizardClient';

export const metadata = { title: 'Business Setup — WhatsAI Assistant' };

export default function SetupPage() {
  return (
    <>
      <PageHeader
        title="Business Setup"
        titleHi="बिज़नेस सेटअप"
        description="Launch a 7-day WhatsApp AI receptionist trial with business details, WhatsApp settings, services, and FAQs."
      />
      <SetupWizardClient />
    </>
  );
}
