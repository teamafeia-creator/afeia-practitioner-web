'use client';

import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { ResourcePicker } from './ResourcePicker';
import { assignResourceToConsultant } from '../../lib/queries/resources';
import type { ResourceCategory } from '../../lib/types';
import { supabase } from '../../lib/supabase';

const SECTION_TO_CATEGORY_MAP: Record<string, ResourceCategory> = {
  alimentation: 'alimentation',
  petit_dejeuner: 'alimentation',
  dejeuner: 'alimentation',
  diner: 'alimentation',
  collation: 'alimentation',
  principes_alimentaires: 'alimentation',
  aliments_a_privilegier: 'alimentation',
  aliments_a_reduire: 'alimentation',
  complement_alimentaire: 'alimentation',
  hydratation: 'hydratation',
  boissons_recommandees: 'hydratation',
  complements_phyto: 'phytotherapie',
  plantes: 'phytotherapie',
  tisanes_infusions: 'phytotherapie',
  huiles_essentielles: 'aromatherapie',
  utilisation_he: 'aromatherapie',
  techniques_respiratoires: 'respiration',
  respiration: 'respiration',
  exercice_respiratoire: 'respiration',
  activite_physique: 'activite_physique',
  mouvement: 'activite_physique',
  type_activite: 'activite_physique',
  frequence_activite: 'activite_physique',
  sommeil: 'sommeil',
  routine_sommeil: 'sommeil',
  conseils_sommeil: 'sommeil',
  gestion_stress: 'gestion_stress',
  relaxation: 'gestion_stress',
  technique_relaxation: 'gestion_stress',
  detox: 'detox',
  drainage: 'detox',
  cure_detox: 'detox',
  digestion: 'digestion',
  transit: 'digestion',
  soutien_digestif: 'digestion',
};

export function ResourceInsertButton({
  consultantId,
  consultantPlanId,
  sectionKey,
  onInsert,
}: {
  consultantId: string;
  consultantPlanId?: string;
  sectionKey: string;
  onInsert: (text: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const filterCategory = SECTION_TO_CATEGORY_MAP[sectionKey];

  async function handleSelect(resource: { id: string; title: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await assignResourceToConsultant(resource.id, consultantId, session.user.id, {
        consultant_plan_id: consultantPlanId,
        plan_section_key: sectionKey,
      });
    }
    onInsert(`\u{1F4DA} Fiche jointe : ${resource.title}`);
    setPickerOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-terracotta/30 px-2 py-1 text-[11px] font-medium text-terracotta transition-colors hover:border-terracotta/50 hover:bg-terracotta/5"
      >
        <Paperclip className="h-3 w-3" />
        Fiche
      </button>

      {pickerOpen && (
        <ResourcePicker
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
          filterCategory={filterCategory}
        />
      )}
    </>
  );
}
