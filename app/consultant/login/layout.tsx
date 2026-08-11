import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion consultant',
  description: 'Accédez à votre espace consultant AFEIA.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
