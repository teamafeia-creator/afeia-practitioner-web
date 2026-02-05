'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFreshDatabase } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toaster';

const EXPECTED_CONFIRMATION = 'SUPPRIMER TOUTES LES DONNEES';
const EXPECTED_CODE = 'FRESH_DATABASE_2026';

type FreshDatabaseButtonProps = {
  onSuccess?: () => void;
};

export function FreshDatabaseButton({ onSuccess }: FreshDatabaseButtonProps) {
  const [step, setStep] = useState(0); // 0: initial, 1: warning, 2: confirm, 3: code
  const [confirmationText, setConfirmationText] = useState('');
  const [code, setCode] = useState('');
  const freshDatabaseMutation = useFreshDatabase();
  const router = useRouter();

  const handleReset = () => {
    setStep(0);
    setConfirmationText('');
    setCode('');
  };

  const handleFreshDatabase = async () => {
    try {
      const result = await freshDatabaseMutation.mutateAsync(code);
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

  // Etape 0 : Bouton initial
  if (step === 0) {
    return (
      <div className="border-2 border-red-600 rounded-lg p-4 bg-red-50">
        <h3 className="text-lg font-bold text-red-600 mb-2">Zone Dangereuse</h3>
        <p className="text-sm text-red-800 mb-4">
          Cette action supprimera <strong>TOUTES les donnees</strong> de la base de donnees.
          A utiliser uniquement en developpement.
        </p>
        <Button
          variant="primary"
          className="bg-red-600 hover:bg-red-700"
          onClick={() => setStep(1)}
        >
          Reinitialiser la Base de Donnees
        </Button>
      </div>
    );
  }

  // Etape 1 : Premier avertissement
  if (step === 1) {
    return (
      <div className="border-2 border-red-600 rounded-lg p-6 bg-red-50 max-w-2xl">
        <h3 className="text-xl font-bold text-red-600 mb-4">AVERTISSEMENT CRITIQUE</h3>

        <div className="bg-white border border-red-300 rounded p-4 mb-4">
          <p className="text-sm text-gray-800 mb-2">
            Cette action va <strong>SUPPRIMER DEFINITIVEMENT</strong> :
          </p>
          <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
            <li>Tous les patients</li>
            <li>Tous les plans de soins</li>
            <li>Tous les messages</li>
            <li>Toutes les consultations</li>
            <li>Tous les questionnaires</li>
            <li>Toutes les notifications</li>
            <li>Tous les journaux</li>
            <li>Toutes les donnees wearables</li>
            <li>Tous les paiements et factures</li>
          </ul>
          <p className="text-sm text-red-600 font-bold mt-3">
            Cette action est IRREVERSIBLE !
          </p>
        </div>

        <p className="text-sm text-gray-800 mb-4">
          Les comptes praticiens seront preserves mais toutes leurs donnees seront perdues.
        </p>

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setStep(2)}
          >
            Je comprends, continuer
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Etape 2 : Confirmation par texte
  if (step === 2) {
    return (
      <div className="border-2 border-red-600 rounded-lg p-6 bg-red-50 max-w-2xl">
        <h3 className="text-xl font-bold text-red-600 mb-4">Confirmation Requise</h3>

        <p className="text-sm text-gray-800 mb-4">
          Pour confirmer cette action destructive, veuillez taper exactement :
        </p>

        <div className="bg-gray-800 text-white font-mono p-3 rounded mb-4 text-center">
          {EXPECTED_CONFIRMATION}
        </div>

        <Input
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder="Tapez la phrase ci-dessus"
          className="mb-4"
          autoFocus
        />

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setStep(3)}
            disabled={confirmationText !== EXPECTED_CONFIRMATION}
          >
            Continuer
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Etape 3 : Code de securite
  if (step === 3) {
    return (
      <div className="border-2 border-red-600 rounded-lg p-6 bg-red-50 max-w-2xl">
        <h3 className="text-xl font-bold text-red-600 mb-4">Code de Securite</h3>

        <p className="text-sm text-gray-800 mb-4">
          Derniere etape : entrez le code de securite pour confirmer.
        </p>

        <div className="bg-yellow-100 border border-yellow-400 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Astuce :</strong> Le code suit le format FRESH_DATABASE_ANNEE
          </p>
        </div>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code de securite"
          className="mb-4 font-mono"
          autoFocus
        />

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleFreshDatabase}
            disabled={code !== EXPECTED_CODE || freshDatabaseMutation.isPending}
            loading={freshDatabaseMutation.isPending}
          >
            {freshDatabaseMutation.isPending ? 'Suppression en cours...' : 'SUPPRIMER TOUT'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={freshDatabaseMutation.isPending}
          >
            Annuler
          </Button>
        </div>

        {freshDatabaseMutation.isPending && (
          <div className="mt-4 p-3 bg-orange-100 border border-orange-400 rounded">
            <p className="text-sm text-orange-800">
              Suppression en cours... Ne fermez pas cette page.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
