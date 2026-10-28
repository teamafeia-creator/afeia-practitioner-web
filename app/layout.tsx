import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { DebugMount } from '@/components/debug/DebugMount';
import { Inter, Source_Serif_4 } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-source-serif'
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afeia.fr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AFEIA — Espace praticien',
    template: '%s | AFEIA'
  },
  description: "Plateforme d'accompagnement naturopathique — espace professionnel. Gestion de consultants, consultations et suivi bien-être.",
  keywords: ['naturopathie', 'praticien', 'santé', 'bien-être', 'accompagnement', 'consultation'],
  authors: [{ name: 'AFEIA' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: 'AFEIA',
    title: 'AFEIA — Espace praticien',
    description: "Plateforme d'accompagnement naturopathique — espace professionnel."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <DebugMount />
      </body>
    </html>
  );
}
