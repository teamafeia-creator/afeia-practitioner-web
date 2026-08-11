import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paiement confirmé',
  description: 'Votre paiement a bien été pris en compte.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
