'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PatientTabs } from '@/components/patients/PatientTabs';
import { ActivationCard } from '@/components/patients/ActivationCard';
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
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Fetch activation code from database
  const fetchActivationCode = useCallback(async () => {
    if (!patient?.email) return;

    try {
      // First check if code was passed via URL
      const urlCode = searchParams.get('activation_code');
      if (urlCode) {
        setActivationCode(urlCode);
        // Clean URL
        router.replace(`/patients/${patientId}`, { scroll: false });
        return;
      }

      // Otherwise, fetch from database
      const { data: otpData } = await supabase
        .from('otp_codes')
        .select('code, expires_at')
        .eq('email', patient.email.toLowerCase())
        .eq('type', 'activation')
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpData) {
        setActivationCode(otpData.code);
        setCodeExpiresAt(otpData.expires_at);
      } else {
        // Try to get from invitation
        const { data: invitationData } = await supabase
          .from('patient_invitations')
          .select('invitation_code, code_expires_at')
          .eq('email', patient.email.toLowerCase())
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invitationData) {
          setActivationCode(invitationData.invitation_code);
          setCodeExpiresAt(invitationData.code_expires_at);
        }
      }
    } catch (err) {
      console.error('Error fetching activation code:', err);
    }
  }, [patient?.email, patientId, router, searchParams]);

  // Handler pour renvoyer le code d'activation
  const handleResendCode = async (): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (!patient?.email) {
      return { success: false, error: 'Email du patient manquant.' };
    }

    setResendingCode(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setToast({
          title: 'Erreur',
          description: 'Session expiree. Veuillez vous reconnecter.',
          variant: 'error'
        });
        return { success: false, error: 'Session expiree.' };
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
        // Update the displayed code
        if (data.code) {
          setActivationCode(data.code);
          setCodeExpiresAt(data.expiresAt || null);
        }
        return { success: true, code: data.code };
      } else {
        return { success: false, error: data.error || 'Impossible de renvoyer le code.' };
      }
    } catch (err) {
      console.error('Erreur renvoi code:', err);
      return { success: false, error: 'Impossible de renvoyer le code.' };
    } finally {
      setResendingCode(false);
    }
  };

  // Handle created=1 query param for toast and fetch activation code
  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setToast({
        title: 'Patient cree',
        description: 'Votre patient a bien ete cree. Le code d\'activation est affiche ci-dessous.',
        variant: 'success'
      });
    }
    // Check for activation code in URL
    const urlCode = searchParams.get('activation_code');
    if (urlCode) {
      setActivationCode(urlCode);
    }
    // Clean URL after reading params
    if (searchParams.get('created') === '1' || urlCode) {
      router.replace(`/patients/${patientId}`, { scroll: false });
    }
  }, [searchParams, patientId, router]);

  // Fetch activation code when patient is loaded and not activated
  useEffect(() => {
    if (patient && patient.activated === false && !activationCode) {
      fetchActivationCode();
    }
  }, [patient, activationCode, fetchActivationCode]);

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
        <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-charcoal">
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

  // Verifier si le patient est active
  const isActivated = patient.activated !== false;
  const patientDisplayName = patient.name || 'Ce patient';

  // Si le patient n'est pas active, afficher la carte d'activation
  if (!isActivated) {
    return (
      <div className="space-y-6">
        {/* Carte d'activation avec le code */}
        {activationCode && patient.email ? (
          <ActivationCard
            code={activationCode}
            patientEmail={patient.email}
            patientName={patientDisplayName}
            expiresAt={codeExpiresAt || undefined}
            onResendCode={handleResendCode}
          />
        ) : (
          <Card className="p-6 border-l-4 border-l-gold">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center">
                <span className="text-2xl">?</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-charcoal">
                  En attente d&apos;activation
                </h3>
                <p className="text-sm text-warmgray mt-1">
                  {patientDisplayName} n&apos;a pas encore active son compte.
                </p>
                {patient.email && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResendCode}
                    loading={resendingCode}
                    className="mt-3"
                  >
                    Envoyer un code d&apos;activation
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Informations patient basiques */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-charcoal mb-4">
            Informations du patient
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-warmgray">Nom</p>
              <p className="text-charcoal">{patientDisplayName}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-sm text-warmgray">Email</p>
                <p className="text-charcoal">{patient.email}</p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-sm text-warmgray">Telephone</p>
                <p className="text-charcoal">{patient.phone}</p>
              </div>
            )}
            {patient.city && (
              <div>
                <p className="text-sm text-warmgray">Ville</p>
                <p className="text-charcoal">{patient.city}</p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-sable">
            <Button variant="secondary" onClick={() => router.push('/patients')}>
              Retour a la liste
            </Button>
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
      </div>
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
