import { PageHeader } from '@/components/shared/PageHeader';
import { PlaybookSetupClient } from '@/components/playbooks/PlaybookSetupClient';

export const metadata = { title: 'Playbook Setup — WhatsAI Assistant' };

export default function PlaybooksPage() {
  return (
    <>
      <PageHeader
        title="Playbook Setup"
        titleHi="प्लेबुक सेटअप"
        description="Choose a vertical, tune qualification questions, and set owner handoff rules for the WhatsApp assistant."
      />
      <PlaybookSetupClient />
    </>
  );
}
