'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Video, Home, Users, Clock } from 'lucide-react';

interface GroupSessionOption {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location_type: string;
  location_details: string | null;
  max_participants: number;
  registration_count: number;
  available_spots: number;
}

interface BookingStepGroupSessionProps {
  slug: string;
  consultationTypeId: string;
  onSelectSession: (session: GroupSessionOption) => void;
  onBack: () => void;
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

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin className="h-4 w-4 text-stone" />,
  video: <Video className="h-4 w-4 text-stone" />,
  home_visit: <Home className="h-4 w-4 text-stone" />,
};

const LOCATION_LABELS: Record<string, string> = {
  in_person: 'Au cabinet',
  video: 'Visio',
  home_visit: 'A domicile',
};

export function BookingStepGroupSession({
  slug,
  consultationTypeId,
  onSelectSession,
  onBack,
}: BookingStepGroupSessionProps) {
  const [sessions, setSessions] = useState<GroupSessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/booking/${slug}/group-sessions?consultation_type_id=${consultationTypeId}`
        );
        if (!res.ok) {
          throw new Error('Erreur lors du chargement');
        }
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch {
        setError('Impossible de charger les seances disponibles.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, consultationTypeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-sage-light transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-charcoal" />
        </button>
        <h2 className="text-lg font-semibold text-charcoal">
          Choisissez une seance
        </h2>
      </div>

      {loading && (
        <div className="text-center py-12 text-stone text-sm">Chargement des seances...</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Users className="h-10 w-10 mx-auto text-stone/40" />
          <p className="text-stone text-sm">Aucune seance disponible pour le moment.</p>
          <p className="text-stone/60 text-xs">Revenez bientot ou contactez le praticien.</p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => {
            const startsAt = new Date(session.starts_at);
            const endsAt = new Date(session.ends_at);
            const isFull = session.available_spots <= 0;
            const isAlmostFull = session.available_spots > 0 && session.available_spots <= 3;

            return (
              <button
                key={session.id}
                onClick={() => !isFull && onSelectSession(session)}
                disabled={isFull}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isFull
                    ? 'border-neutral-200 bg-neutral-50 opacity-60 cursor-not-allowed'
                    : 'border-teal/15 bg-white/70 hover:border-sage/40 hover:bg-white/90 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-charcoal">{session.title}</span>
                      {isFull && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-200 text-neutral-600">
                          Complet
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-stone">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="capitalize">
                          {dateFormatter.format(startsAt)} · {timeFormatter.format(startsAt)} - {timeFormatter.format(endsAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {LOCATION_ICONS[session.location_type] || <MapPin className="h-3.5 w-3.5 text-stone" />}
                        <span>
                          {session.location_details || LOCATION_LABELS[session.location_type] || session.location_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        <span className={
                          isFull
                            ? 'text-neutral-500'
                            : isAlmostFull
                              ? 'text-amber-600 font-medium'
                              : 'text-green-600'
                        }>
                          {isFull
                            ? 'Complet'
                            : `${session.available_spots} place${session.available_spots > 1 ? 's' : ''} restante${session.available_spots > 1 ? 's' : ''} sur ${session.max_participants}`}
                        </span>
                      </div>
                    </div>

                    {session.description && (
                      <p className="mt-2 text-xs text-stone leading-relaxed line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { GroupSessionOption };
