'use client';

import { useState } from 'react';
import { Download, Shield, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';

const PRIVACY_POLICY_URL = 'https://www.afeia.fr/politique-de-confidentialite';

export default function RgpdPage() {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleDownloadData() {
    setDownloadLoading(true);
    try {
      const response = await fetch('/api/me');
      if (!response.ok) {
        throw new Error('Impossible de recuperer vos donnees.');
      }
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mes-donnees-afeia.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[rgpd] download failed', error);
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[rgpd] sign out error', error);
      }
      window.location.href = '/login';
    } catch (error) {
      console.error('[rgpd] delete account error', error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Confidentialite et donnees"
        subtitle="Gerez vos donnees personnelles conformement au RGPD."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Download my data */}
        <Card className="rounded-xl border-divider">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage/10">
                <Download className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h2 className="font-serif text-base font-semibold text-charcoal">
                  Exporter mes donnees
                </h2>
                <p className="text-[13px] text-stone">
                  Telechargez une copie de vos donnees personnelles au format JSON.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              icon={<Download className="h-4 w-4" />}
              loading={downloadLoading}
              onClick={handleDownloadData}
            >
              Telecharger mes donnees
            </Button>
          </CardContent>
        </Card>

        {/* Privacy policy */}
        <Card className="rounded-xl border-divider">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage/10">
                <Shield className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h2 className="font-serif text-base font-semibold text-charcoal">
                  Politique de confidentialite
                </h2>
                <p className="text-[13px] text-stone">
                  Consultez notre politique de protection des donnees personnelles.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="w-full"
                icon={<ExternalLink className="h-4 w-4" />}
                iconPosition="right"
                type="button"
              >
                Lire la politique
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Delete account */}
        <Card className="rounded-xl border-divider">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose/10">
                <Trash2 className="h-5 w-5 text-rose" />
              </div>
              <div>
                <h2 className="font-serif text-base font-semibold text-charcoal">
                  Supprimer mon compte
                </h2>
                <p className="text-[13px] text-stone">
                  Supprimez definitivement votre compte et toutes vos donnees.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteModal(true)}
            >
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Supprimer votre compte"
        message="Cette action est irreversible. Toutes vos donnees personnelles, vos consultants, vos documents et votre historique seront definitivement supprimes. Etes-vous certain de vouloir continuer ?"
        confirmText="Oui, supprimer mon compte"
        cancelText="Annuler"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
