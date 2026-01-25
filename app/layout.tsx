import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AFEIA — Espace Naturopathe',
  description: "Plateforme d'accompagnement naturopathique — espace professionnel."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
