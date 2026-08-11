import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Créer un compte consultant',
  description: 'Activez votre compte consultant AFEIA.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
