'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

const CHAPTERS = [
  { l: 'Votre journée', at: 0 },
  { l: 'La revue du matin', at: 6 },
  { l: 'Dossiers clairs', at: 12 },
  { l: 'Conseillanciers', at: 18 }
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function PresentationVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);

  const current = CHAPTERS.reduce((acc, c, i) => (time >= c.at ? i : acc), 0);

  const seek = (at: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = at;
    setStarted(true);
    void v.play();
  };

  if (!src) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[18px] border border-divider bg-surface text-center">
        <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-sage-light text-sage">
          <Play className="h-8 w-8" />
        </span>
        <span className="text-base font-medium">La vidéo de présentation arrive bientôt.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-[18px] border border-divider bg-surface">
        <video
          ref={ref}
          src={src}
          poster={poster}
          controls={started}
          playsInline
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          className="block h-full w-full"
        />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[rgba(10,14,20,0.72)]">
            <button
              type="button"
              onClick={() => seek(0)}
              aria-label="Lire la vidéo de présentation"
              className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-sage text-ink shadow-[0_0_0_10px_rgba(109,212,184,0.15)]"
            >
              <Play className="h-8 w-8 fill-current" />
            </button>
            <span className="text-base font-medium">Découvrir Afeia</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
        {CHAPTERS.map((c, i) => {
          const on = started && i === current;
          return (
            <button
              key={c.l}
              type="button"
              onClick={() => seek(c.at)}
              aria-current={on ? 'true' : undefined}
              className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left ${on ? 'border-[#2F5A50] bg-surface-raised' : 'border-divider bg-transparent'}`}
            >
              <span className="text-xs tabular-nums text-stone">{fmt(c.at)}</span>
              <span className="text-sm font-medium text-charcoal">{c.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
