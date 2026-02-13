'use client';

import { useLocalParticipant, useDaily, DailyVideo } from '@daily-co/daily-react';
import { Video, VideoOff, Mic, MicOff, User, Clock } from 'lucide-react';
import { useState } from 'react';

interface WaitingRoomProps {
  userName: string;
  practitionerName: string;
  consultationType: string;
  startsAt: string;
  isOwner: boolean;
  onJoin: () => void;
}

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function WaitingRoom({
  userName,
  practitionerName,
  consultationType,
  startsAt,
  isOwner,
  onJoin,
}: WaitingRoomProps) {
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  function toggleAudio() {
    daily?.setLocalAudio(!audioOn);
    setAudioOn(!audioOn);
  }

  function toggleVideo() {
    daily?.setLocalVideo(!videoOn);
    setVideoOn(!videoOn);
  }

  const startsAtDate = new Date(startsAt);

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
            <Video className="h-6 w-6 text-sage" />
          </div>
          <h1 className="text-xl font-semibold text-[#2D3436]">
            Consultation en visio
          </h1>
          <p className="text-sm text-[#6B7280]">
            {consultationType} avec {practitionerName}
          </p>
        </div>

        {/* Appointment info */}
        <div className="flex items-center justify-center gap-4 text-sm text-[#6B7280]">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="capitalize">{dateFormatter.format(startsAtDate)}</span>
          </div>
          <span>a {timeFormatter.format(startsAtDate)}</span>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video bg-[#2D3436] rounded-xl overflow-hidden">
          {localParticipant && videoOn ? (
            <DailyVideo
              type="video"
              sessionId={localParticipant.session_id}
              mirror
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <User className="h-10 w-10 text-white/60" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 text-sm text-white/80 bg-black/30 px-2 py-1 rounded">
            {userName}
          </div>
        </div>

        {/* Media controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              audioOn
                ? 'bg-[#2D3436]/10 text-[#2D3436] hover:bg-[#2D3436]/20'
                : 'bg-red-100 text-red-500 hover:bg-red-200'
            }`}
          >
            {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              videoOn
                ? 'bg-[#2D3436]/10 text-[#2D3436] hover:bg-[#2D3436]/20'
                : 'bg-red-100 text-red-500 hover:bg-red-200'
            }`}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Waiting message */}
        <p className="text-center text-sm text-[#6B7280]">
          {isOwner
            ? 'En attente du consultant...'
            : 'Votre praticien n\'est pas encore connecte. Veuillez patienter.'}
        </p>

        {/* Join button */}
        <button
          onClick={onJoin}
          className="w-full py-3 px-6 rounded-xl bg-[#5B8C6E] text-white font-medium text-base hover:bg-[#4a7a5d] transition-colors"
        >
          Rejoindre la consultation
        </button>
      </div>
    </div>
  );
}
