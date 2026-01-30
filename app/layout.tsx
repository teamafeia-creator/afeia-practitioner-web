import './globals.css';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afeia.fr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AFEIA — Espace Naturopathe',
    template: '%s | AFEIA'
  },
  description: "Plateforme d'accompagnement naturopathique — espace professionnel. Gestion de patients, consultations et suivi bien-être.",
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
      <body>{children}</body>
    </html>
  );
}
