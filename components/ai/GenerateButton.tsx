'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface GenerateButtonProps {
  consultantId: string;
  planId?: string | null;
  onGenerated: (content: Record<string, string>, plan: Record<string, unknown> | null) => void;
  onError: (error: string) => void;
  onMedicalAlerts?: (alerts: string[]) => void;
  disabled?: boolean;
}

export function GenerateButton({
  consultantId,
  planId,
  onGenerated,
  onError,
  onMedicalAlerts,
  disabled,
}: GenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    setShowMenu(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch('/api/ai/generate-conseillancier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          consultantId,
          planId: planId || null,
          generationType: planId ? 'regenerate' : 'full',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          onError(
            `Quota IA atteint (${data.quota_used}/${data.quota_max} ce mois). Passez au plan supérieur pour plus de générations.`
          );
        } else {
          onError(data.error || 'Erreur de génération.');
        }
        return;
      }

      if (data.metadata?.medical_alerts?.length > 0 && onMedicalAlerts) {
        onMedicalAlerts(data.metadata.medical_alerts);
      }

      onGenerated(data.content, data.plan);
    } catch {
      onError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex">
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={disabled || isGenerating}
          loading={isGenerating}
          icon={!isGenerating ? <Sparkles className="w-4 h-4" /> : undefined}
          className="rounded-r-none bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
        >
          {isGenerating ? 'Génération en cours...' : 'Générer avec l\'IA'}
        </Button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={disabled || isGenerating}
          className="px-2 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-r-sm border-l border-purple-500 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border z-50">
            <button
              onClick={handleGenerate}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm rounded-t-lg"
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-2 text-violet-600" />
              {planId ? 'Régénérer tout' : 'Générer tout'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
