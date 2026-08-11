import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription praticien',
  description: 'Créez votre compte praticien AFEIA.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
