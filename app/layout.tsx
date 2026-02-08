import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/QueryProvider';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afeia.fr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AFEIA — Espace Naturopathe',
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
    title: 'AFEIA — Espace Naturopathe',
    description: "Plateforme d'accompagnement naturopathique — espace professionnel."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
