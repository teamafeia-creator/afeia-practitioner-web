'use client';

/**
 * Error Boundary racine (App Router) — capte les erreurs qui remontent jusqu'au
 * layout racine. Doit rendre ses propres <html> et <body>.
 *
 * Comme `app/error.tsx`, il remonte l'erreur au panneau debug via le point
 * d'entrée global, sans importer le bundle debug.
 */
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      window.__afeiaDebugReportReactError?.(error, 'global-error');
    } catch {
      /* noop */
    }
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Erreur inattendue</h2>
        <p style={{ color: '#6b7280', maxWidth: 440 }}>
          L&apos;application a rencontré une erreur. Rechargez la page ou réessayez.
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
      </body>
    </html>
  );
}
