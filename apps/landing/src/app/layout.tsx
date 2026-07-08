import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const noto = Noto_Sans_Devanagari({ subsets: ['devanagari','latin'], variable: '--font-hindi', display: 'swap' });
export const metadata: Metadata = {
  title: { default: 'X7 WhatsAI Assistant', template: `%s · X7 WhatsAI Assistant` },
  description: 'WhatsApp-first AI receptionist offer pages for Indian SMBs.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${inter.variable} ${noto.variable}`}><body>{children}</body></html>;
}
