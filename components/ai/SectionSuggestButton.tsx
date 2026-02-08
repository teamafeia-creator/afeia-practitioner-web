'use client';

import { useState } from 'react';
import { Sparkles, Check, X, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SectionSuggestButtonProps {
  consultantId: string;
  fieldKey: string;
  onAccept: (text: string) => void;
}

export function SectionSuggestButton({
  consultantId,
  fieldKey,
  onAccept,
}: SectionSuggestButtonProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function handleSuggest() {
    setIsSuggesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/ai/suggest-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ consultantId, fieldKey }),
      });

      const data = await res.json();
      if (data.success) {
        setSuggestion(data.text);
      }
    } catch (err) {
      console.error('Suggestion error:', err);
    } finally {
      setIsSuggesting(false);
    }
  }

  function acceptSuggestion() {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
    }
  }

  function rejectSuggestion() {
    setSuggestion(null);
  }

  if (suggestion) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-xs font-medium text-violet-700">Suggestion IA</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{suggestion}</p>
        <div className="flex gap-2">
          <button
            onClick={acceptSuggestion}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Accepter
          </button>
          <button
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-gray-600 text-xs rounded border hover:bg-gray-50 transition-colors"
          >
            {isSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Régénérer
          </button>
          <button
            onClick={rejectSuggestion}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-gray-500 text-xs rounded border hover:bg-gray-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Ignorer
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleSuggest}
      disabled={isSuggesting}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded transition-colors mt-1"
      title="Suggérer avec l'IA"
    >
      {isSuggesting ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      Suggérer
    </button>
  );
}
