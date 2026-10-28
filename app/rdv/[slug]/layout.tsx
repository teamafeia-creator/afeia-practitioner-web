import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prise de rendez-vous — AFEIA',
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream text-charcoal">{children}</div>;
}
