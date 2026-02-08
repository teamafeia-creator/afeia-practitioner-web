import type { InvoiceTemplate } from './types';

export const DEFAULT_TEMPLATES: Omit<
  InvoiceTemplate,
  'practitioner_id' | 'created_at' | 'updated_at'
>[] = [
  {
    id: 'consult_premiere',
    label: 'Premiere consultation',
    description: 'Bilan de vitalite + conseillancier personnalise',
    montant_defaut: 80.0,
    duree_defaut: 90,
    ordre: 1,
    is_active: true,
  },
  {
    id: 'consult_suivi',
    label: 'Consultation de suivi',
    description: 'Suivi naturopathique + ajustements du programme',
    montant_defaut: 60.0,
    duree_defaut: 60,
    ordre: 2,
    is_active: true,
  },
  {
    id: 'atelier',
    label: 'Atelier collectif',
    description: 'Atelier thematique en groupe',
    montant_defaut: 25.0,
    duree_defaut: 120,
    ordre: 3,
    is_active: true,
  },
];
