import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Questionnaire préliminaire',
  description: "Envoyez votre questionnaire d'anamnèse à votre naturopathe.",
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
