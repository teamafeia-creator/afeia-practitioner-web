// Types pour les contre-indications

export interface Substance {
  id: string;
  name: string;
  type: 'plante' | 'complement' | 'huile_essentielle' | 'autre';
  aliases: string[];
}

export interface Condition {
  id: string;
  name: string;
  type: 'etat_physiologique' | 'pathologie' | 'traitement_medicamenteux' | 'allergie';
}

export interface ContraindicationRule {
  id: string;
  substance_id: string;
  condition_id: string;
  severity: 'critical' | 'warning' | 'info';
  message_fr: string;
  recommendation_fr: string | null;
  source: string | null;
}

export interface SubstanceInteraction {
  id: string;
  substance_a_id: string;
  substance_b_id: string;
  severity: 'critical' | 'warning' | 'info';
  message_fr: string;
  recommendation_fr: string | null;
  source: string | null;
}

export interface ContraindicationAlert {
  id: string;
  ruleId: string;
  ruleType: 'condition' | 'interaction';
  severity: 'critical' | 'warning' | 'info';
  substanceName: string;
  conditionOrSubstanceName: string;
  messageFr: string;
  recommendationFr: string | null;
  source: string | null;
  acknowledged: boolean;
}

export interface ContraindicationLog {
  id: string;
  practitioner_id: string;
  consultant_id: string;
  consultant_plan_id: string | null;
  rule_id: string | null;
  rule_type: 'condition' | 'interaction' | null;
  severity: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

// Consultant enrichi (depuis consultant_list_view)
export interface ConsultantListItem {
  id: string;
  name: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  is_premium: boolean;
  status: string | null;
  main_concern: string | null;
  consultation_reason: string | null;
  practitioner_id: string;
  created_at: string;
  activated: boolean;
  last_journal_entry: string | null;
  journal_entries_last_7d: number;
  journal_entries_last_30d: number;
  next_appointment: string | null;
  plan_status: string | null;
  plan_updated_at: string | null;
  total_sessions: number;
  last_consultation_date: string | null;
  last_appointment_date: string | null;
}
