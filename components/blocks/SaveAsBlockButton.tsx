'use client';

import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { BlockForm } from './BlockForm';
import type { Block, BlockSection } from '../../lib/blocks-types';

interface SaveAsBlockButtonProps {
  selectedText: string;
  section: BlockSection;
  onSaved?: (block: Block) => void;
}

export function SaveAsBlockButton({
  selectedText,
  section,
  onSaved,
}: SaveAsBlockButtonProps) {
  const [formOpen, setFormOpen] = useState(false);

  if (!selectedText?.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-sage/30 bg-sage-light px-3 text-xs font-semibold text-sage transition-colors hover:border-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
      >
        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Sauvegarder comme bloc
      </button>

      <BlockForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(block) => {
          onSaved?.(block);
          setFormOpen(false);
        }}
        defaultSection={section}
        defaultContent={selectedText}
      />
    </>
  );
}
