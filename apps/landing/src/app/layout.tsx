import type { Metadata } from 'next';
import { Noto_Sans_Devanagari } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

const noto = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-hindi',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://landing-iota-lemon.vercel.app'),
  title: { default: 'WhatsAI Assistant', template: '%s | WhatsAI Assistant' },
  description:
    'A controlled WhatsApp receptionist for Indian businesses. Every automated reply stays under the owner’s control.',
  openGraph: {
    title: 'WhatsAI Assistant',
    description: 'Turn WhatsApp enquiries into appointments with replies you approve.',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
