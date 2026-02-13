export default function BookingNotFound() {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone/10">
        <svg
          className="h-8 w-8 text-stone"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-charcoal">
        Praticien non trouve
      </h1>
      <p className="text-sm text-stone max-w-sm mx-auto">
        Ce praticien n&apos;existe pas sur AFEIA ou n&apos;a pas active
        la prise de rendez-vous en ligne.
      </p>
      <a
        href="https://afeia.fr"
        className="inline-block mt-4 text-sm text-sage hover:underline"
      >
        Retour a afeia.fr
      </a>
    </div>
  );
}
