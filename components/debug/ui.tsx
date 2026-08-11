'use client';

/**
 * Petits utilitaires d'UI partagés par le chrome du panneau et les outils :
 * copie presse-papiers robuste, bouton de copie, jetons de couleur.
 *
 * Le panneau debug utilise des styles inline (thème sombre autonome) pour ne
 * pas dépendre de Tailwind ni des styles applicatifs, et rester lisible
 * par-dessus n'importe quelle page.
 */
import { useCallback, useState } from 'react';

export const DEBUG_COLORS = {
  bg: '#0f1115',
  panel: '#171a21',
  border: '#2a2f3a',
  text: '#e6e8ec',
  muted: '#9aa3b2',
  accent: '#4f9cf9',
  alert: '#ff5c5c',
  warn: '#ffb020',
  ok: '#3ecf8e',
};

/** Copie du texte dans le presse-papiers avec repli execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* on tente le repli */
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

interface CopyButtonProps {
  getText: () => string;
  label?: string;
  title?: string;
  style?: React.CSSProperties;
}

/** Bouton « Copier » réutilisable qui affiche un accusé de copie transitoire. */
export function CopyButton({ getText, label = 'Copier', title, style }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(async () => {
    const ok = await copyText(getText());
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 1200);
  }, [getText]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      style={{
        cursor: 'pointer',
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 6,
        border: `1px solid ${DEBUG_COLORS.border}`,
        background: copied ? DEBUG_COLORS.ok : 'transparent',
        color: copied ? '#04110b' : DEBUG_COLORS.text,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {copied ? '✓ Copié' : label}
    </button>
  );
}
