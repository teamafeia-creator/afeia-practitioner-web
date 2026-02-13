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
        className="inline-flex items-center gap-1 text-[11px] text-stone hover:text-sage transition-colors"
      >
        <BookmarkPlus className="h-3 w-3" />
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
