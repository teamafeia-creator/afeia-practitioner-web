'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ConsultantTabs } from '@/components/consultants/ConsultantTabs';
import { ActivationCard } from '@/components/consultants/ActivationCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { getConsultantById } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useDeleteConsultant } from '@/hooks/useConsultants';
import type { ConsultantWithDetails } from '@/lib/types';
import { Trash2 } from 'lucide-react';

export default function ConsultantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultantId = params.id;
  const [consultant, setConsultant] = useState<ConsultantWithDetails | null>(null);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const deleteConsultantMutation = useDeleteConsultant();

  // Handler pour supprimer le consultant
  const handleDeleteConsultant = async () => {
    try {
      await deleteConsultantMutation.mutateAsync(consultantId);
      setShowDeleteModal(false);
      setToast({
        title: 'Consultant supprime',
        description: 'Le dossier consultant a ete supprime avec succes.',
        variant: 'success'
      });
      // Rediriger vers la liste des consultants
      setTimeout(() => {
        router.push('/consultants?deleted=1');
      }, 1500);
    } catch (err) {
      console.error('Erreur suppression consultant:', err);
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de supprimer le consultant.',
        variant: 'error'
      });
    }
  };

  // Fetch activation code from database
  const fetchActivationCode = useCallback(async () => {
    if (!consultant?.email) return;

    try {
      // First check if code was passed via URL
      const urlCode = searchParams.get('activation_code');
      if (urlCode) {
        setActivationCode(urlCode);
        // Clean URL
        router.replace(`/consultants/${consultantId}`, { scroll: false });
        return;
      }

      // Otherwise, fetch from database
      const { data: otpData } = await supabase
        .from('otp_codes')
        .select('code, expires_at')
        .eq('email', consultant.email.toLowerCase())
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
          .from('consultant_invitations')
          .select('invitation_code, code_expires_at')
          .eq('email', consultant.email.toLowerCase())
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
  }, [consultant?.email, consultantId, router, searchParams]);

  // Handler pour renvoyer le code d'activation
  const handleResendCode = async (): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (!consultant?.email) {
      return { success: false, error: 'Email du consultant manquant.' };
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

      const consultantName = consultant.name || 'Consultant';

      const response = await fetch('/api/consultants/send-activation-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: consultant.email,
          name: consultantName,
          consultantId: consultant.id
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
        title: 'Consultant cree',
        description: 'Votre consultant a bien ete cree. Le code d\'activation est affiche ci-dessous.',
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
      router.replace(`/consultants/${consultantId}`, { scroll: false });
    }
  }, [searchParams, consultantId, router]);

  // Fetch activation code when consultant is loaded and not activated
  useEffect(() => {
    if (consultant && consultant.activated === false && !activationCode) {
      fetchActivationCode();
    }
  }, [consultant, activationCode, fetchActivationCode]);

  useEffect(() => {
    let active = true;

    async function loadConsultant() {
      setLoading(true);
      setError(null);
      const data = await getConsultantById(consultantId);
      if (!active) return;
      if (!data) {
        setError('Consultant introuvable.');
        setConsultant(null);
        setLoading(false);
        return;
      }
      setConsultant(data);
      setLoading(false);
    }

    if (consultantId) {
      loadConsultant();
    }

    return () => {
      active = false;
    };
  }, [consultantId]);

  // ✅ Écouter les changements en temps réel via Supabase Realtime
  useEffect(() => {
    if (!consultantId || !consultant) return;

    // Ne pas écouter si le consultant est déjà activé
    if (consultant.activated) return;

    console.log('═══════════════════════════════════════');
    console.log('👂 ÉCOUTE REALTIME ACTIVÉE');
    console.log('Consultant ID:', consultantId);
    console.log('Statut actuel:', consultant.activated ? 'Activé' : 'En attente');
    console.log('═══════════════════════════════════════');

    const channel = supabase
      .channel(`consultant-${consultantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultants',
          filter: `id=eq.${consultantId}`
        },
        (payload) => {
          console.log('═══════════════════════════════════════');
          console.log('🔔 CHANGEMENT DÉTECTÉ VIA REALTIME');
          console.log('Payload:', payload);
          console.log('═══════════════════════════════════════');

          const newData = payload.new as { activated?: boolean };

          // Si le consultant vient d'être activé
          if (newData.activated === true) {
            console.log('═══════════════════════════════════════');
            console.log('🎉 CONSULTANT ACTIVÉ ! Rechargement...');
            console.log('═══════════════════════════════════════');

            // Recharger toutes les données du consultant
            getConsultantById(consultantId).then((updatedConsultant) => {
              if (updatedConsultant) {
                setConsultant(updatedConsultant);
                setToast({
                  title: 'Consultant activé !',
                  description: `${updatedConsultant.name || 'Le consultant'} a activé son compte. Les onglets sont maintenant accessibles.`,
                  variant: 'success'
                });
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status Supabase Realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement Realtime réussi');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur Realtime');
        }
      });

    return () => {
      console.log('👋 Désinscription Realtime');
      supabase.removeChannel(channel);
    };
  }, [consultantId, consultant?.activated]);

  // ✅ Polling de secours (si Realtime ne fonctionne pas)
  // Vérifie toutes les 5 secondes si le consultant non activé a été activé
  useEffect(() => {
    if (!consultant || consultant.activated) return;

    console.log('═══════════════════════════════════════');
    console.log('⏱️ DÉMARRAGE POLLING (secours)');
    console.log('Vérification toutes les 5 secondes');
    console.log('═══════════════════════════════════════');

    const interval = setInterval(async () => {
      console.log('🔄 Vérification du statut...');

      const updatedConsultant = await getConsultantById(consultantId);

      if (updatedConsultant?.activated) {
        console.log('═══════════════════════════════════════');
        console.log('🎉 CONSULTANT ACTIVÉ ! (via polling)');
        console.log('═══════════════════════════════════════');

        setConsultant(updatedConsultant);
        setToast({
          title: 'Consultant activé !',
          description: `${updatedConsultant.name || 'Le consultant'} a activé son compte.`,
          variant: 'success'
        });
        clearInterval(interval);
      }
    }, 5000); // 5 secondes

    return () => {
      console.log('🛑 Arrêt du polling');
      clearInterval(interval);
    };
  }, [consultant?.activated, consultantId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du dossier consultant…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-charcoal">
          {error}
        </div>
        <Button variant="secondary" onClick={() => router.push('/consultants')}>
          Retour aux consultants
        </Button>
      </div>
    );
  }

  if (!consultant) {
    return null;
  }

  // Verifier si le consultant est active
  const isActivated = consultant.activated !== false;
  const consultantDisplayName = consultant.name || 'Ce consultant';

  // Si le consultant n'est pas active, afficher la carte d'activation
  if (!isActivated) {
    return (
      <div className="space-y-6">
        {/* Carte d'activation avec le code */}
        {activationCode && consultant.email ? (
          <ActivationCard
            code={activationCode}
            consultantEmail={consultant.email}
            consultantName={consultantDisplayName}
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
                  {consultantDisplayName} n&apos;a pas encore active son compte.
                </p>
                {consultant.email && (
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

        {/* Informations consultant basiques */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-charcoal mb-4">
            Informations du consultant
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-warmgray">Nom</p>
              <p className="text-charcoal">{consultantDisplayName}</p>
            </div>
            {consultant.email && (
              <div>
                <p className="text-sm text-warmgray">Email</p>
                <p className="text-charcoal">{consultant.email}</p>
              </div>
            )}
            {consultant.phone && (
              <div>
                <p className="text-sm text-warmgray">Telephone</p>
                <p className="text-charcoal">{consultant.phone}</p>
              </div>
            )}
            {consultant.city && (
              <div>
                <p className="text-sm text-warmgray">Ville</p>
                <p className="text-charcoal">{consultant.city}</p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-sable flex justify-between items-center">
            <Button variant="secondary" onClick={() => router.push('/consultants')}>
              Retour a la liste
            </Button>
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le consultant
            </Button>
          </div>
        </Card>

        {/* Modal de confirmation de suppression */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Supprimer le consultant"
          description="Cette action est irreversible. Le dossier du consultant sera marque comme supprime."
        >
          <div className="space-y-4">
            <p className="text-sm text-warmgray">
              Etes-vous sur de vouloir supprimer le dossier de <strong>{consultantDisplayName}</strong> ?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                Cette action supprimera definitivement l&apos;acces a ce dossier consultant.
              </p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConsultant}
              loading={deleteConsultantMutation.isPending}
            >
              {deleteConsultantMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </ModalFooter>
        </Modal>

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
      <ConsultantTabs consultant={consultant} />
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
