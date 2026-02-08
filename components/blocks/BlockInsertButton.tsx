'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BlockLibrarySidebar } from './BlockLibrarySidebar';
import type { BlockSection, ConsultationMotif } from '../../lib/blocks-types';

interface BlockInsertButtonProps {
  section: BlockSection;
  sectionLabel: string;
  consultationMotif?: string | null;
  onInsert: (content: string) => void;
}

export function BlockInsertButton({
  section,
  sectionLabel,
  consultationMotif,
  onInsert,
}: BlockInsertButtonProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-teal/30 px-2 py-1 text-[11px] font-medium text-teal transition-colors hover:border-teal/50 hover:bg-teal/5"
      >
        <Plus className="h-3 w-3" />
        Insérer un bloc
      </button>

      <BlockLibrarySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        section={section}
        sectionLabel={sectionLabel}
        consultationMotif={consultationMotif as ConsultationMotif | undefined}
        onInsert={(content) => {
          onInsert(content);
          setSidebarOpen(false);
        }}
      />
    </>
  );
}
