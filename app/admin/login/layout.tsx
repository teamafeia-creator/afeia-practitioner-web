import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion admin',
  description: 'Accès réservé aux administrateurs AFEIA.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
