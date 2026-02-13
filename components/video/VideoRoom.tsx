'use client';

import {
  DailyProvider,
  DailyVideo,
  DailyAudio,
  useParticipantIds,
  useLocalParticipant,
  useMeetingState,
  useDaily,
} from '@daily-co/daily-react';
import { useState, useCallback } from 'react';
import { User, AlertCircle } from 'lucide-react';
import { VideoControls } from './VideoControls';
import { WaitingRoom } from './WaitingRoom';

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
}

function VideoCallUI({
  userName,
  isOwner,
  appointmentDetails,
  onLeave,
}: Omit<VideoRoomProps, 'roomUrl' | 'token'>) {
  const meetingState = useMeetingState();
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const [hasJoined, setHasJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);

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
      />
    );
  }

  // Connecting
  if (meetingState === 'joining-meeting' || meetingState === 'loading') {
    return (
      <div className="min-h-screen bg-[#2D3436] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#2D3436] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Erreur de connexion</h2>
          <p className="text-white/60 text-sm">
            Impossible de se connecter a la visioconference. Verifiez votre connexion internet et reessayez.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#5B8C6E] text-white rounded-lg hover:bg-[#4a7a5d] transition-colors"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  // Joined - show video call
  const hasRemoteParticipants = remoteParticipantIds.length > 0;

  return (
    <div className="min-h-screen bg-[#2D3436] flex flex-col">
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

      {/* Controls */}
      <VideoControls
        onLeave={handleLeave}
        onToggleChat={() => setShowChat(!showChat)}
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
      />
    </DailyProvider>
  );
}
