import type { Metadata } from 'next';
import { WhatsAiLanding } from '@/components/marketing/WhatsAiLanding';

export const metadata: Metadata = {
  title: 'WhatsAI Assistant | Turn WhatsApp Enquiries Into Appointments',
  description:
    'A controlled WhatsApp receptionist for Indian SMBs. Send approved replies, capture leads, share media, and hand hot conversations to your team.',
};

export default function HomePage() {
  return <WhatsAiLanding />;
}
