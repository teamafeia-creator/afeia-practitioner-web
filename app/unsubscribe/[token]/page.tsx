/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function UnsubscribePage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleUnsubscribe() {
    setStatus('loading');
    try {
      const response = await fetch('/api/reminders/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la desinscription');
      }

      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        {status === 'success' ? (
          <>
            <div className="text-4xl mb-4">&#10003;</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Desinscription confirmee
            </h1>
            <p className="text-sm text-gray-600">
              Vous ne recevrez plus de rappels de rendez-vous par email.
              Vous pourrez toujours prendre rendez-vous normalement.
            </p>
          </>
        ) : status === 'error' ? (
          <>
            <div className="text-4xl mb-4">&#10060;</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Erreur
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {errorMessage || 'Le lien de desinscription est invalide ou a expire.'}
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-[#2B5651] hover:underline"
            >
              Reessayer
            </button>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">&#128231;</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Se desinscrire des rappels
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Vous ne souhaitez plus recevoir les rappels de rendez-vous par email ?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-[#2B5651] text-white rounded-lg font-medium text-sm hover:bg-[#234744] transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Traitement...' : 'Se desinscrire des rappels'}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Vous pourrez toujours prendre rendez-vous normalement.
            </p>
          </>
        )}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">AFEIA</p>
        </div>
      </div>
    </div>
  );
}
