import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/shared/toast';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SYNAPSE — Where Minds Collide to Find Truth',
  description:
    'A multi-agent AI conversation platform where diverse artificial intelligences discuss, critique, and converge on the strongest possible answer to your problem.',
  openGraph: {
    title: 'SYNAPSE — Where Minds Collide to Find Truth',
    description:
      'Watch AI agents discuss, challenge, and converge on answers to complex problems.',
    siteName: 'SYNAPSE',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SYNAPSE — Where Minds Collide to Find Truth',
    description:
      'Watch AI agents discuss, challenge, and converge on answers to complex problems.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background text-foreground antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
