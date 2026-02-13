'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, Video, ArrowLeft } from 'lucide-react';
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
  | { type: 'error'; message: string }
  | { type: 'ready'; roomUrl: string; token: string; userName: string; isOwner: boolean; details: {
      practitionerName: string;
      consultantName: string;
      consultationType: string;
      startsAt: string;
    }};

export default function VideoConsultationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  const consultantToken = searchParams.get('token');
  const consultantName = searchParams.get('name') || 'Consultant';

  const [state, setState] = useState<PageState>({ type: 'loading' });
  const [hasLeft, setHasLeft] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if (consultantToken) {
          // Consultant mode: use token from query params
          // Fetch minimal appointment info via public API
          const res = await fetch(`/api/video/${appointmentId}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultantName }),
          });

          if (!res.ok) {
            const data = await res.json();
            setState({ type: 'error', message: data.error || 'Impossible d\'acceder a la consultation.' });
            return;
          }

          const data = await res.json();
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
            setState({ type: 'error', message: 'Veuillez vous connecter pour acceder a la consultation.' });
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
            setState({ type: 'error', message: 'Rendez-vous non trouve.' });
            return;
          }

          if (appointment.practitioner_id !== userData.user.id) {
            setState({ type: 'error', message: 'Vous n\'etes pas le praticien de ce rendez-vous.' });
            return;
          }

          if (!appointment.video_room_name) {
            setState({ type: 'error', message: 'Ce rendez-vous n\'a pas de salle de visioconference.' });
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
        console.error('Video page init error:', error);
        setState({ type: 'error', message: 'Une erreur est survenue.' });
      }
    }

    init();
  }, [appointmentId, consultantToken, consultantName]);

  if (hasLeft) {
    return (
      <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10">
            <Video className="h-8 w-8 text-sage" />
          </div>
          <h1 className="text-xl font-semibold text-[#2D3436]">
            Consultation terminee
          </h1>
          <p className="text-sm text-[#6B7280]">
            Merci pour votre consultation. Vous pouvez fermer cette fenetre.
          </p>
          {!consultantToken && (
            <button
              onClick={() => router.push('/agenda')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5B8C6E] text-white rounded-lg hover:bg-[#4a7a5d] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a l&apos;agenda
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.type === 'loading') {
    return (
      <div className="min-h-screen bg-[#2D3436] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/80 text-sm">Chargement de la consultation...</p>
        </div>
      </div>
    );
  }

  if (state.type === 'error') {
    return (
      <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-[#2D3436]">
            Acces impossible
          </h1>
          <p className="text-sm text-[#6B7280]">{state.message}</p>
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
