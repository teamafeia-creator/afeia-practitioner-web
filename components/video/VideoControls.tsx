'use client';

import { useDaily, useLocalParticipant } from '@daily-co/daily-react';
import {
  Mic, MicOff, Camera, CameraOff, Monitor, MonitorOff,
  MessageSquare, PhoneOff,
} from 'lucide-react';
import { useState } from 'react';

interface VideoControlsProps {
  onLeave: () => void;
  onToggleChat: () => void;
}

export function VideoControls({ onLeave, onToggleChat }: VideoControlsProps) {
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const isAudioOn = localParticipant?.audio;
  const isVideoOn = localParticipant?.video;

  function toggleAudio() {
    daily?.setLocalAudio(!isAudioOn);
  }

  function toggleVideo() {
    daily?.setLocalVideo(!isVideoOn);
  }

  function toggleScreenShare() {
    if (isScreenSharing) {
      daily?.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      daily?.startScreenShare();
      setIsScreenSharing(true);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#2D3436]/80 backdrop-blur-md flex items-center justify-center gap-4 z-50">
      <button
        onClick={toggleAudio}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isAudioOn
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-white/20 text-red-400 hover:bg-white/30'
        }`}
        title={isAudioOn ? 'Couper le micro' : 'Activer le micro'}
      >
        {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      <button
        onClick={toggleVideo}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isVideoOn
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-white/20 text-red-400 hover:bg-white/30'
        }`}
        title={isVideoOn ? 'Couper la camera' : 'Activer la camera'}
      >
        {isVideoOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
      </button>

      <button
        onClick={toggleScreenShare}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isScreenSharing
            ? 'bg-sage/30 text-sage hover:bg-sage/40'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        title={isScreenSharing ? 'Arreter le partage' : 'Partager l\'ecran'}
      >
        {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
      </button>

      <button
        onClick={onToggleChat}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
        title="Chat"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <button
        onClick={onLeave}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
        title="Raccrocher"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
