// Types pour les filtres avances de la liste des consultants

export interface ConsultantFilters {
  // V1
  carePlanStatus: ('none' | 'draft' | 'shared' | 'to_renew')[];
  lastActivity: '<7d' | '<30d' | '>30d' | 'never' | null;
  badge: ('premium' | 'standard')[];
  nextAppointment: 'this_week' | 'this_month' | 'none' | null;

  // V2
  mainConcern: string[];
  adherenceLevel: ('active' | 'declining' | 'inactive')[];
  registrationDate: '<1m' | '1-6m' | '>6m' | null;
}

export interface ConsultantSortOption {
  field: 'name' | 'last_activity' | 'next_appointment' | 'created_at' | 'attention_priority';
  order: 'asc' | 'desc';
}

export interface SavedView {
  id: string;
  practitioner_id: string;
  name: string;
  filters: ConsultantFilters;
  sort_by: string;
  sort_order: string;
  position: number;
  created_at: string;
}

export const DEFAULT_FILTERS: ConsultantFilters = {
  carePlanStatus: [],
  lastActivity: null,
  badge: [],
  nextAppointment: null,
  mainConcern: [],
  adherenceLevel: [],
  registrationDate: null,
};

export const FILTER_LABELS: Record<string, string> = {
  carePlanStatus: 'Conseillancier',
  lastActivity: 'Derniere activite',
  badge: 'Badge',
  nextAppointment: 'Prochain RDV',
  mainConcern: 'Motif',
  adherenceLevel: 'Adhesion',
  registrationDate: 'Inscription',
};

export const CARE_PLAN_STATUS_LABELS: Record<string, string> = {
  none: 'Aucun',
  draft: 'Brouillon',
  shared: 'Partage',
  to_renew: 'A renouveler',
};

export const LAST_ACTIVITY_LABELS: Record<string, string> = {
  '<7d': 'Moins de 7 jours',
  '<30d': 'Moins de 30 jours',
  '>30d': 'Plus de 30 jours',
  never: 'Jamais',
};

export const NEXT_APPOINTMENT_LABELS: Record<string, string> = {
  this_week: 'Cette semaine',
  this_month: 'Ce mois',
  none: 'Aucun',
};

export const ADHERENCE_LABELS: Record<string, string> = {
  active: 'Actif',
  declining: 'En baisse',
  inactive: 'Inactif',
};

export const REGISTRATION_DATE_LABELS: Record<string, string> = {
  '<1m': 'Moins d\'1 mois',
  '1-6m': '1 a 6 mois',
  '>6m': 'Plus de 6 mois',
};

export const SORT_LABELS: Record<string, string> = {
  name: 'Alphabetique',
  last_activity: 'Derniere activite',
  next_appointment: 'Prochain RDV',
  created_at: 'Date d\'inscription',
  attention_priority: 'Priorite d\'attention',
};
