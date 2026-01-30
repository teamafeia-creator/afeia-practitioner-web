'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PatientTabs } from '@/components/patients/PatientTabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { getPatientById } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { PatientWithDetails } from '@/lib/types';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = params.id;
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingCode, setResendingCode] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Handler pour renvoyer le code d'activation
  const handleResendCode = async () => {
    if (!patient?.email) return;

    setResendingCode(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setToast({
          title: 'Erreur',
          description: 'Session expirée. Veuillez vous reconnecter.',
          variant: 'error'
        });
        return;
      }

      const patientName = patient.name || 'Patient';

      const response = await fetch('/api/patients/send-activation-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: patient.email,
          name: patientName,
          patientId: patient.id
        })
      });

      const data = await response.json();

      if (data.ok) {
        const codeDisplay = data.code ? `\n\nCode OTP : ${data.code}` : '';
        setToast({
          title: 'Code envoyé',
          description: `Email envoyé à ${patient.email}${codeDisplay}`,
          variant: 'success'
        });
      } else {
        setToast({
          title: 'Erreur',
          description: data.error || 'Impossible de renvoyer le code.',
          variant: 'error'
        });
      }
    } catch (err) {
      console.error('Erreur renvoi code:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible de renvoyer le code.',
        variant: 'error'
      });
    } finally {
      setResendingCode(false);
    }
  };

  // Handle created=1 query param for toast
  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setToast({
        title: 'Patient créé',
        description: 'Votre patient a bien été créé.',
        variant: 'success'
      });
      // Clean URL by removing query params
      router.replace(`/patients/${patientId}`, { scroll: false });
    }
  }, [searchParams, patientId, router]);

  useEffect(() => {
    let active = true;

    async function loadPatient() {
      setLoading(true);
      setError(null);
      const data = await getPatientById(patientId);
      if (!active) return;
      if (!data) {
        setError('Patient introuvable.');
        setPatient(null);
        setLoading(false);
        return;
      }
      setPatient(data);
      setLoading(false);
    }

    if (patientId) {
      loadPatient();
    }

    return () => {
      active = false;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du dossier patient…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
          {error}
        </div>
        <Button variant="secondary" onClick={() => router.push('/patients')}>
          Retour aux patients
        </Button>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  // Vérifier si le patient est activé
  // Note: activated field comes from DB but may not be in TypeScript type
  const isActivated = (patient as { activated?: boolean }).activated !== false;
  const patientDisplayName = patient.name || 'Ce patient';

  // Si le patient n'est pas activé, afficher un message d'avertissement
  if (!isActivated) {
    return (
      <>
        <Card className="p-8 text-center border-l-4 border-l-amber-400">
          <div className="space-y-4">
            <div className="text-4xl">⏳</div>
            <h3 className="text-xl font-semibold text-charcoal">
              Patient en attente d&apos;activation
            </h3>
            <p className="text-warmgray max-w-md mx-auto">
              {patientDisplayName} n&apos;a pas encore activé son compte.
              Un code d&apos;activation a été envoyé à {patient.email}.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="secondary" onClick={() => router.push('/patients')}>
                Retour à la liste
              </Button>
              <Button
                variant="primary"
                onClick={handleResendCode}
                loading={resendingCode}
              >
                Renvoyer le code
              </Button>
            </div>
          </div>
        </Card>
        {toast ? (
          <Toast
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <PatientTabs patient={patient} />
      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
