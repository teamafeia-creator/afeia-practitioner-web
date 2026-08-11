import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace praticien AFEIA.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
