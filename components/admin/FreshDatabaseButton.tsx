'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFreshDatabase } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toaster';
import { AlertTriangle, Trash2 } from 'lucide-react';

const EXPECTED_CONFIRMATION = 'SUPPRIMER TOUT';
const EXPECTED_CODE = 'FRESH_DATABASE_2026';

type FreshDatabaseButtonProps = {
  onSuccess?: () => void;
};

export function FreshDatabaseButton({ onSuccess }: FreshDatabaseButtonProps) {
  const [step, setStep] = useState(0); // 0: initial, 1: first modal, 2: text confirm
  const [confirmationText, setConfirmationText] = useState('');
  const freshDatabaseMutation = useFreshDatabase();
  const router = useRouter();

  const handleReset = () => {
    setStep(0);
    setConfirmationText('');
  };

  const handleFreshDatabase = async () => {
    try {
      const result = await freshDatabaseMutation.mutateAsync(EXPECTED_CODE);
      showToast.success(
        `Reinitialisation terminee. ${result.totalDeleted} lignes supprimees.`
      );
      handleReset();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erreur lors de la reinitialisation');
    }
  };

  // Step 0: Collapsed danger zone
  if (step === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800">Zone dangereuse</h3>
            <p className="text-xs text-red-600 mt-1">
              Supprime tous les praticiens, patients, et donnees associees. Irreversible.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="bg-red-600 hover:bg-red-700 shrink-0"
            onClick={() => setStep(1)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Reinitialiser la base de donnees
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: First warning modal
  if (step === 1) {
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4">
          Reinitialiser la base de donnees ?
        </h3>

        <div className="rounded-lg bg-white border border-red-200 p-4 mb-4">
          <p className="text-sm text-slate-700 mb-3">
            Cette action va supprimer <strong className="text-red-700">definitivement</strong> toutes
            les donnees :
          </p>
          <ul className="text-sm text-slate-600 space-y-1.5 ml-4 list-disc">
            <li>Praticiens et leurs profils</li>
            <li>Patients / consultants</li>
            <li>Plans de soins et conseillanciers</li>
            <li>Messages, consultations, rendez-vous</li>
            <li>Questionnaires et anamneses</li>
            <li>Journaux et donnees wearables</li>
            <li>Notifications et logs d&apos;activite</li>
            <li>Abonnements et donnees de facturation</li>
          </ul>
          <p className="text-sm text-red-700 font-semibold mt-3">
            Cette action est irreversible.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setStep(2)}
          >
            Je comprends, continuer
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Text confirmation
  if (step === 2) {
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4">
          Confirmation requise
        </h3>

        <p className="text-sm text-slate-700 mb-4">
          Pour confirmer, tapez <strong className="font-mono text-red-700">{EXPECTED_CONFIRMATION}</strong> dans
          le champ ci-dessous :
        </p>

        <Input
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={EXPECTED_CONFIRMATION}
          className="mb-4 font-mono"
          autoFocus
        />

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={freshDatabaseMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleFreshDatabase}
            disabled={confirmationText !== EXPECTED_CONFIRMATION || freshDatabaseMutation.isPending}
            loading={freshDatabaseMutation.isPending}
          >
            {freshDatabaseMutation.isPending ? 'Suppression en cours...' : 'Supprimer definitivement'}
          </Button>
        </div>

        {freshDatabaseMutation.isPending && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Suppression en cours... Ne fermez pas cette page.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
