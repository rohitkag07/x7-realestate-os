import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from '@/components/ui/sonner';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: '#00A884',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={GeistSans.variable}
      suppressHydrationWarning
      style={{
        ['--font-noto-devanagari' as string]: '"Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", sans-serif',
      }}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
