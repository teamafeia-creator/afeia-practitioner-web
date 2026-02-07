'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

const CALENDLY_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_STYLE_SRC = 'https://assets.calendly.com/assets/external/widget.css';

type ConsultantInfo = {
  id: string;
  name: string;
  email?: string | null;
};

type CalendlyButtonProps = {
  consultant: ConsultantInfo;
  calendlyUrl?: string | null;
};

type CalendlyPopupOptions = {
  url: string;
  prefill?: {
    name?: string;
    email?: string;
    customAnswers?: Record<string, string>;
  };
  utm?: Record<string, string>;
};

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: CalendlyPopupOptions) => void;
    };
  }
}

export function CalendlyButton({ consultant, calendlyUrl }: CalendlyButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingStyle = document.querySelector<HTMLLinkElement>(
      `link[href="${CALENDLY_STYLE_SRC}"]`
    );
    if (!existingStyle) {
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = CALENDLY_STYLE_SRC;
      document.head.appendChild(styleLink);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_SRC}"]`
    );

    if (window.Calendly) {
      setIsReady(true);
      return;
    }

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = CALENDLY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => setIsReady(true);
      script.onerror = () => setError('Impossible de charger le widget Calendly.');
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setIsReady(true));
    }
  }, []);

  function handleOpenCalendly() {
    setError(null);

    if (!calendlyUrl) {
      setError('Veuillez configurer votre lien Calendly dans les paramètres.');
      return;
    }

    if (!consultant.email) {
      setError('Ajoutez un email consultant pour pré-remplir la réservation.');
      return;
    }

    if (!window.Calendly || !isReady) {
      setError('Chargement du widget Calendly en cours...');
      return;
    }

    setOpening(true);
    console.log('[calendly] open widget', { calendlyUrl, consultantId: consultant.id });
    window.Calendly.initPopupWidget({
      url: calendlyUrl,
      prefill: {
        name: consultant.name,
        email: consultant.email,
        customAnswers: {
          a1: consultant.id
        }
      },
      utm: {
        utmSource: 'afeia-app'
      }
    });
    setTimeout(() => setOpening(false), 800);
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={handleOpenCalendly} loading={opening} className="w-full sm:w-auto">
        Prendre rendez-vous
      </Button>
      {error ? <p className="text-xs text-aubergine">{error}</p> : null}
    </div>
  );
}
