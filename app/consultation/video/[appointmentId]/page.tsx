'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, Video, ArrowLeft, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const VideoRoom = dynamic(
  () => import('@/components/video/VideoRoom').then((mod) => mod.VideoRoom),
  { ssr: false }
);

interface AppointmentInfo {
  id: string;
  practitioner_id: string;
  starts_at: string;
  ends_at: string;
  video_link: string;
  video_room_name: string;
  consultation_type?: { name: string } | null;
  patient?: { name?: string; first_name?: string; last_name?: string } | null;
  booking_name?: string | null;
}

interface PractitionerInfo {
  full_name: string;
}

type PageState =
  | { type: 'loading' }
  | { type: 'error'; message: string; opensAt?: string; showLogin?: boolean }
  | { type: 'ready'; roomUrl: string; token: string; userName: string; isOwner: boolean; details: {
      practitionerName: string;
      consultantName: string;
      consultationType: string;
      startsAt: string;
    }};

const openingHour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const openingDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** « à 14 h 05 », ou « le mardi 12 novembre à 14 h 05 » si ce n'est pas aujourd'hui. */
function openingLabel(date: Date): string {
  const hour = openingHour.format(date).replace(':', ' h ');
  return date.toDateString() === new Date().toDateString() ? `à ${hour}` : `le ${openingDay.format(date)} à ${hour}`;
}

export default function VideoConsultationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  const consultantToken = searchParams.get('token');

  const [state, setState] = useState<PageState>({ type: 'loading' });
  const [hasLeft, setHasLeft] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function init() {
      try {
        if (consultantToken) {
          // Consultant : le secret du lien reçu par e-mail est vérifié par le serveur
          const res = await fetch(`/api/video/${appointmentId}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: consultantToken }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setState({
              type: 'error',
              message: data.error || 'Impossible d\'accéder à la consultation.',
              opensAt: data.code === 'NOT_YET_OPEN' ? data.opensAt : undefined,
            });
            return;
          }

          const data = await res.json();
          const consultantName = data.consultantName || 'Consultant';
          setState({
            type: 'ready',
            roomUrl: data.roomUrl,
            token: data.token,
            userName: consultantName,
            isOwner: false,
            details: {
              practitionerName: data.practitionerName || 'Votre praticien',
              consultantName,
              consultationType: data.consultationType || 'Consultation',
              startsAt: data.startsAt || new Date().toISOString(),
            },
          });
        } else {
          // Practitioner mode: verify auth
          const { data: userData, error: authError } = await supabase.auth.getUser();
          if (authError || !userData.user) {
            // Sans secret ni session : lien incomplet (le praticien, lui, doit se connecter)
            setState({ type: 'error', message: 'Ce lien de consultation n\'est pas valide.', showLogin: true });
            return;
          }

          // Fetch appointment details
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select(`
              id, practitioner_id, starts_at, ends_at, video_link, video_room_name,
              booking_name,
              patient:consultants(name, first_name, last_name),
              consultation_type:consultation_types(name)
            `)
            .eq('id', appointmentId)
            .single();

          if (aptError || !appointment) {
            setState({ type: 'error', message: 'Rendez-vous non trouvé.' });
            return;
          }

          if (appointment.practitioner_id !== userData.user.id) {
            setState({ type: 'error', message: 'Vous n\'êtes pas le praticien de ce rendez-vous.' });
            return;
          }

          if (!appointment.video_room_name) {
            setState({ type: 'error', message: 'Ce rendez-vous n\'a pas de salle de visioconférence.' });
            return;
          }

          // Get meeting token for practitioner
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;

          const tokenRes = await fetch(`/api/video/${appointmentId}/token`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!tokenRes.ok) {
            const data = await tokenRes.json();
            setState({ type: 'error', message: data.error || 'Impossible d\'obtenir le token de visio.' });
            return;
          }

          const tokenData = await tokenRes.json();

          // Get practitioner name
          const { data: practitioner } = await supabase
            .from('practitioners')
            .select('full_name')
            .eq('id', userData.user.id)
            .single();

          const apt = appointment as unknown as AppointmentInfo;
          const patientName = apt.patient
            ? (apt.patient.name || [apt.patient.first_name, apt.patient.last_name].filter(Boolean).join(' '))
            : (apt.booking_name || 'Consultant');

          setState({
            type: 'ready',
            roomUrl: tokenData.roomUrl,
            token: tokenData.token,
            userName: practitioner?.full_name || 'Praticien',
            isOwner: true,
            details: {
              practitionerName: practitioner?.full_name || 'Praticien',
              consultantName: patientName || 'Consultant',
              consultationType: apt.consultation_type?.name || 'Consultation',
              startsAt: apt.starts_at,
            },
          });
        }
      } catch (error) {
        console.error('Vidéo page init error:', error);
        setState({ type: 'error', message: 'Une erreur est survenue.' });
      }
    }

    setState({ type: 'loading' });
    init();
  }, [appointmentId, consultantToken, attempt]);

  if (hasLeft) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10">
            <Video className="h-8 w-8 text-sage" />
          </div>
          <h1 className="text-xl font-semibold text-charcoal">
            Consultation terminée
          </h1>
          <p className="text-sm text-[#8B95A5]">
            Merci pour votre consultation. Vous pouvez fermer cette fenêtre.
          </p>
          {!consultantToken && (
            <button
              onClick={() => router.push('/agenda')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6DD4B8] text-ink rounded-lg hover:bg-sage-deep transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;agenda
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.type === 'loading') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/80 text-sm">Chargement de la consultation...</p>
        </div>
      </div>
    );
  }

  if (state.type === 'error') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          {state.opensAt ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10">
              <Clock className="h-8 w-8 text-sage" />
            </div>
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          )}
          <h1 className="text-xl font-semibold text-charcoal">
            {state.opensAt ? 'Un peu de patience' : 'Accès impossible'}
          </h1>
          {state.opensAt ? (
            <div className="space-y-4">
              <p className="text-sm text-[#8B95A5]">
                La consultation n&apos;est pas encore accessible. Elle ouvrira {openingLabel(new Date(state.opensAt))}, 15 minutes avant le début de la séance.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6DD4B8] text-ink rounded-lg hover:bg-sage-deep transition-colors text-sm font-medium"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  Réessayer
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8B95A5]">{state.message}</p>
          )}
          {state.showLogin && (
            <p className="text-sm text-[#8B95A5]">
              Vous êtes le praticien de cette séance ?{' '}
              <Link href="/login" className="text-sage hover:text-sage-dark">Connectez-vous</Link>.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <VideoRoom
      roomUrl={state.roomUrl}
      token={state.token}
      userName={state.userName}
      isOwner={state.isOwner}
      appointmentDetails={state.details}
      onLeave={() => setHasLeft(true)}
    />
  );
}
