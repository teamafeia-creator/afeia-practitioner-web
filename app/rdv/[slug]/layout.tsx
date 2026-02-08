import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prise de rendez-vous — AFEIA',
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sable to-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {children}
      </div>
      <footer className="border-t border-teal/10 py-6 text-center text-xs text-warmgray">
        <span>Powered by </span>
        <a
          href="https://afeia.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal hover:underline"
        >
          AFEIA
        </a>
      </footer>
    </div>
  );
}
