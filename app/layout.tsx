import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AFEIA — Espace Naturopathe',
  description: 'Plateforme d’accompagnement naturopathique — espace professionnel.',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
