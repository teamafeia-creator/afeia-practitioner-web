import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bienvenue',
  description: "Découvrez AFEIA, la plateforme d'accompagnement naturopathique.",
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
