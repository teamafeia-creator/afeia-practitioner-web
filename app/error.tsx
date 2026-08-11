'use client';

/**
 * Error Boundary de segment (App Router).
 *
 * Rôle double :
 * 1. remonter l'erreur de rendu React au panneau debug s'il est actif, via le
 *    point d'entrée global `window.__afeiaDebugReportReactError` (aucun import
 *    du bundle debug ici : si le mode est éteint, l'appel est simplement absent) ;
 * 2. afficher un repli utilisateur sobre avec possibilité de réessayer.
 */
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      window.__afeiaDebugReportReactError?.(error);
    } catch {
      /* ne jamais masquer l'erreur d'origine */
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Une erreur est survenue</h2>
      <p style={{ color: '#6b7280', maxWidth: 420 }}>
        Un problème est survenu lors de l&apos;affichage de cette page. Vous pouvez réessayer.
      </p>
      {error?.digest && <code style={{ fontSize: 12, color: '#9ca3af' }}>ref: {error.digest}</code>}
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#111827',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
