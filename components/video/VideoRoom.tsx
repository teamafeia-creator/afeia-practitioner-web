'use client';

import {
  DailyProvider,
  DailyVideo,
  DailyAudio,
  useParticipantIds,
  useLocalParticipant,
  useMeetingState,
  useDaily,
  useDailyEvent,
  useDailyError,
} from '@daily-co/daily-react';
import type { DailyEventObjectAccessState } from '@daily-co/daily-js';
import { useState, useCallback, useEffect } from 'react';
import { User, AlertCircle, Clock } from 'lucide-react';
import { VideoControls } from './VideoControls';
import { WaitingRoom } from './WaitingRoom';
import { WaitingParticipants } from './WaitingParticipants';

interface AppointmentDetails {
  practitionerName: string;
  consultantName: string;
  consultationType: string;
  startsAt: string;
}

interface VideoRoomProps {
  roomUrl: string;
  token: string;
  userName: string;
  isOwner: boolean;
  appointmentDetails: AppointmentDetails;
  onLeave: () => void;
  /** Hôte : copie le lien à transmettre au consultant. */
  onCopyConsultantLink?: () => void;
}

function VideoCallUI({
  userName,
  isOwner,
  appointmentDetails,
  onLeave,
  onCopyConsultantLink,
}: Omit<VideoRoomProps, 'roomUrl' | 'token'>) {
  const meetingState = useMeetingState();
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const { meetingError } = useDailyError();
  const [hasJoined, setHasJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // Consultant placé en salle d'attente Daily (salle privée) : l'hôte doit le faire entrer
  const [lobby, setLobby] = useState<'none' | 'waiting' | 'denied'>('none');

  useDailyEvent(
    'access-state-updated',
    useCallback((ev: DailyEventObjectAccessState) => {
      if (ev.access !== 'unknown' && ev.access.level === 'full') setLobby('none');
    }, [])
  );

  useEffect(() => {
    if (isOwner || !daily || meetingState !== 'joined-meeting') return;
    const state = daily.accessState();
    if (state.access === 'unknown' || state.access.level !== 'lobby') return;
    setLobby('waiting');
    if (state.awaitingAccess) return;
    daily
      .requestAccess({ name: userName, access: { level: 'full' } })
      .then((res) => {
        if (!res.granted) setLobby('denied');
      })
      .catch(() => setLobby('denied'));
  }, [isOwner, daily, meetingState, userName]);

  const handleJoin = useCallback(() => {
    daily?.join();
    setHasJoined(true);
  }, [daily]);

  const handleLeave = useCallback(() => {
    daily?.leave();
    onLeave();
  }, [daily, onLeave]);

  // Pre-join: show waiting room
  if (!hasJoined || meetingState === 'new' || meetingState === undefined) {
    return (
      <WaitingRoom
        userName={userName}
        practitionerName={appointmentDetails.practitionerName}
        consultationType={appointmentDetails.consultationType}
        startsAt={appointmentDetails.startsAt}
        isOwner={isOwner}
        onJoin={handleJoin}
        onCopyConsultantLink={onCopyConsultantLink}
      />
    );
  }

  // Connecting
  if (meetingState === 'joining-meeting' || meetingState === 'loading') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/80 text-sm">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  // Error
  if (meetingState === 'error') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Erreur de connexion</h2>
          <p className="text-white/60 text-sm">
            Impossible de se connecter à la visioconférence. Vérifiez votre connexion internet et réessayez.
          </p>
          {meetingError?.errorMsg && (
            <p className="text-white/40 text-xs break-words">Détail : {meetingError.errorMsg}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#6DD4B8] text-ink rounded-lg hover:bg-sage-deep transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Consultant en salle d'attente : en attente de l'accord du praticien
  if (lobby !== 'none') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            {lobby === 'waiting' ? <Clock className="h-8 w-8 text-white/70" /> : <AlertCircle className="h-8 w-8 text-red-400" />}
          </div>
          <h2 className="text-xl font-semibold text-white">
            {lobby === 'waiting' ? 'Salle d’attente' : 'Entrée refusée'}
          </h2>
          <p className="text-white/60 text-sm">
            {lobby === 'waiting'
              ? `${appointmentDetails.practitionerName} a été prévenu·e de votre arrivée et va vous faire entrer.`
              : `${appointmentDetails.practitionerName} n’a pas accepté votre demande d’entrée.`}
          </p>
          <button
            onClick={handleLeave}
            className="px-6 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-colors text-sm"
          >
            Quitter
          </button>
        </div>
      </div>
    );
  }

  // Joined - show video call
  const hasRemoteParticipants = remoteParticipantIds.length > 0;

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Video area */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        {hasRemoteParticipants ? (
          <div className="relative w-full h-full max-h-[calc(100vh-6rem)] flex items-center justify-center">
            {/* Remote video (main) */}
            <div className="w-full max-w-4xl aspect-video bg-[#1a1f21] rounded-xl overflow-hidden shadow-2xl">
              <DailyVideo
                type="video"
                sessionId={remoteParticipantIds[0]}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Local video (PiP) */}
            {localParticipant && (
              <div className="absolute bottom-4 right-4 w-48 aspect-video bg-[#1a1f21] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10">
                {localParticipant.video ? (
                  <DailyVideo
                    type="video"
                    sessionId={localParticipant.session_id}
                    mirror
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white/40" />
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 text-xs text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
                  Vous
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Waiting for other participant */
          <div className="text-center space-y-6">
            {/* Show local video while waiting */}
            {localParticipant && (
              <div className="mx-auto w-80 aspect-video bg-[#1a1f21] rounded-xl overflow-hidden shadow-lg">
                {localParticipant.video ? (
                  <DailyVideo
                    type="video"
                    sessionId={localParticipant.session_id}
                    mirror
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-12 w-12 text-white/40" />
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-white/80 text-base">
                {isOwner ? 'En attente du consultant...' : 'En attente du praticien...'}
              </p>
              <p className="text-white/40 text-sm mt-1">
                Vous serez connecte automatiquement
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Audio (always rendered) */}
      <DailyAudio />

      {/* Hôte : demandes d'entrée */}
      {isOwner && <WaitingParticipants />}

      {/* Controls */}
      <VideoControls
        onLeave={handleLeave}
        onToggleChat={() => setShowChat(!showChat)}
        onCopyConsultantLink={isOwner ? onCopyConsultantLink : undefined}
      />
    </div>
  );
}

export function VideoRoom(props: VideoRoomProps) {
  return (
    <DailyProvider url={props.roomUrl} token={props.token}>
      <VideoCallUI
        userName={props.userName}
        isOwner={props.isOwner}
        appointmentDetails={props.appointmentDetails}
        onLeave={props.onLeave}
        onCopyConsultantLink={props.onCopyConsultantLink}
      />
    </DailyProvider>
  );
}
