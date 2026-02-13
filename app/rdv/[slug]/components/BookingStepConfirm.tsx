'use client';

import { CalendarPlus, ArrowLeft, MapPin, Download, Video } from 'lucide-react';

interface BookingStepConfirmProps {
  confirmation: {
    appointment_id: string;
    starts_at: string;
    ends_at: string;
    consultation_type_name: string;
    duration_minutes: number;
    practitioner_name: string;
    practitioner_address: string | null;
    ics_download_url: string;
    video_link?: string | null;
  };
  email: string;
  onReset: () => void;
  isGroupSession?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function BookingStepConfirm({
  confirmation,
  email,
  onReset,
  isGroupSession,
}: BookingStepConfirmProps) {
  const startsAt = new Date(confirmation.starts_at);

  return (
    <div className="space-y-6 text-center">
      {/* Success icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/15">
        <svg
          className="h-8 w-8 text-sage"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-charcoal">
          {isGroupSession ? 'Inscription confirmee !' : 'Rendez-vous confirme !'}
        </h2>
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-teal/15 bg-white/70 p-5 text-left space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone">Date :</span>
          <span className="font-medium text-charcoal capitalize">
            {dateFormatter.format(startsAt)} a {timeFormatter.format(startsAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone">Seance :</span>
          <span className="font-medium text-charcoal">
            {confirmation.consultation_type_name}{confirmation.duration_minutes > 0 ? ` (${confirmation.duration_minutes} min)` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone">Avec :</span>
          <span className="font-medium text-charcoal">
            {confirmation.practitioner_name}
          </span>
        </div>
        {confirmation.practitioner_address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-sage flex-shrink-0" />
            <span className="text-charcoal">
              {confirmation.practitioner_address}
            </span>
          </div>
        )}
      </div>

      {confirmation.video_link && (
        <div className="rounded-xl border border-sage/20 bg-sage/5 p-5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-sage" />
            <span className="text-sm font-semibold text-charcoal">
              Consultation en visioconference
            </span>
          </div>
          <p className="text-sm text-stone">
            Le lien sera actif 15 minutes avant votre consultation. Il a aussi ete envoye par email.
          </p>
          {(() => {
            const now = new Date();
            const startsAtTime = new Date(confirmation.starts_at);
            const windowStart = new Date(startsAtTime.getTime() - 15 * 60 * 1000);
            const isAccessible = now >= windowStart;

            return isAccessible ? (
              <a
                href={`/consultation/video/${confirmation.appointment_id}?token=public&name=Consultant`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-sage px-5 py-2.5 text-sm font-medium text-white hover:bg-sage/90 transition-colors"
              >
                <Video className="h-4 w-4" />
                Rejoindre la visio
              </a>
            ) : (
              <div className="text-xs text-stone text-center">
                Le bouton sera actif 15 minutes avant le debut.
              </div>
            );
          })()}
        </div>
      )}

      <p className="text-sm text-stone">
        Un email de confirmation vous a ete envoye a{' '}
        <span className="font-medium">{email}</span>
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!isGroupSession && confirmation.ics_download_url && (
          <a
            href={confirmation.ics_download_url}
            download
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sage/20 bg-white/80 px-5 py-2.5 text-sm font-medium text-sage hover:bg-sage-light/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Ajouter a mon agenda
          </a>
        )}
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-sage/20 bg-white/80 px-5 py-2.5 text-sm font-medium text-stone hover:bg-stone/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Prendre un autre RDV
        </button>
      </div>
    </div>
  );
}
