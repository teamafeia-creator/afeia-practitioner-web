import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsultantContext {
  consultant: Record<string, unknown> | null;
  anamnesis: Record<string, unknown> | null;
  journalSummary: Record<string, unknown> | null;
  previousPlans: Record<string, unknown>[];
  consultationNotes: string | null;
}

/**
 * Assemble tout le contexte d'un consultant pour l'injection dans le prompt IA.
 * Les donnees sont agregees et formatees cote serveur.
 */
export async function buildConsultantContext(
  supabase: SupabaseClient,
  consultantId: string
): Promise<ConsultantContext> {
  // 1. Donnees du consultant
  const { data: consultant } = await supabase
    .from('consultants')
    .select('*')
    .eq('id', consultantId)
    .single();

  // 2. Anamnese (bilan de vitalite)
  // Try consultant_anamnesis first (JSONB), then anamneses (legacy columns)
  let anamnesis = null;
  const { data: anamnesisJsonb } = await supabase
    .from('consultant_anamnesis')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (anamnesisJsonb) {
    anamnesis = anamnesisJsonb;
  } else {
    const { data: anamneseLegacy } = await supabase
      .from('anamneses')
      .select('*')
      .eq('consultant_id', consultantId)
      .maybeSingle();
    anamnesis = anamneseLegacy;
  }

  // 3. Journal quotidien (14 derniers jours, agrege)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: journalEntries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  const journalSummary = aggregateJournal(journalEntries || []);

  // 4. Derniers conseillanciers valides (2 max)
  const { data: previousPlans } = await supabase
    .from('consultant_plans')
    .select('*')
    .eq('consultant_id', consultantId)
    .eq('status', 'shared')
    .order('created_at', { ascending: false })
    .limit(2);

  // 5. Dernieres notes de consultation
  const { data: lastConsultation } = await supabase
    .from('consultations')
    .select('notes')
    .eq('consultant_id', consultantId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    consultant,
    anamnesis,
    journalSummary,
    previousPlans: previousPlans || [],
    consultationNotes: lastConsultation?.notes || null,
  };
}

function aggregateJournal(entries: Record<string, unknown>[]): Record<string, unknown> | null {
  if (entries.length === 0) return null;

  const totalEntries = entries.length;

  // Map mood emojis to numeric values for averaging
  const moodMap: Record<string, number> = { '🙂': 5, '😐': 3, '🙁': 1 };
  const energyMap: Record<string, number> = { 'Élevé': 5, 'Moyen': 3, 'Bas': 1 };

  const moods = entries
    .filter((e) => e.mood != null)
    .map((e) => moodMap[e.mood as string] ?? 3);
  const energies = entries
    .filter((e) => e.energy != null)
    .map((e) => energyMap[e.energy as string] ?? 3);

  const avgMood =
    moods.length > 0
      ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)
      : null;
  const avgEnergy =
    energies.length > 0
      ? (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1)
      : null;

  // Trends (first half vs second half)
  const mid = Math.floor(moods.length / 2);
  const moodTrend =
    moods.length >= 4
      ? moods.slice(0, mid).reduce((a, b) => a + b, 0) / mid >
        moods.slice(mid).reduce((a, b) => a + b, 0) / (moods.length - mid)
        ? 'en baisse'
        : 'en hausse'
      : 'stable';
  const energyTrend =
    energies.length >= 4
      ? energies.slice(0, mid).reduce((a, b) => a + b, 0) / mid >
        energies.slice(mid).reduce((a, b) => a + b, 0) / (energies.length - mid)
        ? 'en baisse'
        : 'en hausse'
      : 'stable';

  // Adherence to pillars
  const hydrationDays = entries.filter((e) => e.adherence_hydratation === true).length;
  const breathingDays = entries.filter((e) => e.adherence_respiration === true).length;
  const movementDays = entries.filter((e) => e.adherence_mouvement === true).length;
  const plantsDays = entries.filter((e) => e.adherence_plantes === true).length;

  // Recent notes (3 latest)
  const recentNotes = entries
    .filter((e) => e.text && String(e.text).trim())
    .slice(0, 3)
    .map((e) => e.text as string);

  return {
    periode: `${totalEntries} entrees sur les 14 derniers jours`,
    humeur_moyenne: avgMood ? `${avgMood}/5` : 'Non renseignee',
    humeur_tendance: moodTrend,
    energie_moyenne: avgEnergy ? `${avgEnergy}/5` : 'Non renseignee',
    energie_tendance: energyTrend,
    adhesion_hydratation: `${Math.round((hydrationDays / totalEntries) * 100)}%`,
    adhesion_respiration: `${Math.round((breathingDays / totalEntries) * 100)}%`,
    adhesion_mouvement: `${Math.round((movementDays / totalEntries) * 100)}%`,
    adhesion_plantes: `${Math.round((plantsDays / totalEntries) * 100)}%`,
    notes_recentes: recentNotes,
  };
}

/**
 * Formate le contexte en texte pour injection dans le prompt utilisateur.
 * Les donnees sont anonymisees : pas de nom de famille, pas d'email.
 */
export function formatContextForPrompt(ctx: ConsultantContext): string {
  let text = '';

  // Infos generales (anonymisees)
  if (ctx.consultant) {
    const name = ctx.consultant.name as string | undefined;
    const prenom = name?.split(' ')[0] || 'Le consultant';
    text += `INFORMATIONS DU CONSULTANT :\n`;
    text += `- Prenom : ${prenom}\n`;
    if (ctx.consultant.age) text += `- Age : ${ctx.consultant.age} ans\n`;
    if (ctx.consultant.city) text += `- Ville : ${ctx.consultant.city}\n`;
    if (ctx.consultant.consultation_reason) text += `- Motif de consultation : ${ctx.consultant.consultation_reason}\n`;
    text += '\n';
  }

  // Anamnese
  if (ctx.anamnesis) {
    text += `BILAN DE VITALITE (ANAMNESE) :\n`;
    if (ctx.anamnesis.answers && typeof ctx.anamnesis.answers === 'object') {
      // New JSONB format with nested sections
      for (const [sectionKey, sectionData] of Object.entries(
        ctx.anamnesis.answers as Record<string, unknown>
      )) {
        text += `\n[${sectionKey}]\n`;
        if (typeof sectionData === 'object' && sectionData !== null) {
          for (const [key, value] of Object.entries(sectionData as Record<string, unknown>)) {
            if (value && String(value).trim()) {
              text += `- ${key} : ${value}\n`;
            }
          }
        } else if (typeof sectionData === 'string') {
          text += `${sectionData}\n`;
        }
      }
    } else {
      // Legacy flat columns
      const fields = [
        'motif',
        'objectifs',
        'alimentation',
        'digestion',
        'sommeil',
        'stress',
        'complement',
        'allergies',
      ];
      for (const field of fields) {
        if (ctx.anamnesis[field]) {
          text += `- ${field} : ${ctx.anamnesis[field]}\n`;
        }
      }
    }
    text += '\n';
  }

  // Journal quotidien
  if (ctx.journalSummary) {
    text += `JOURNAL QUOTIDIEN (14 derniers jours — resume agrege) :\n`;
    for (const [key, value] of Object.entries(ctx.journalSummary)) {
      if (key === 'notes_recentes' && Array.isArray(value) && value.length > 0) {
        text += `- Notes recentes du consultant : "${value.join('" / "')}"\n`;
      } else {
        text += `- ${key.replace(/_/g, ' ')} : ${value}\n`;
      }
    }
    text += '\n';
  }

  // Conseillanciers precedents
  if (ctx.previousPlans.length > 0) {
    text += `CONSEILLANCIERS PRECEDENTS (${ctx.previousPlans.length}) :\n`;
    for (const prev of ctx.previousPlans) {
      const content = prev.content as Record<string, string> | null;
      text += `\n--- Version ${prev.version} (${new Date(prev.created_at as string).toLocaleDateString('fr-FR')}) ---\n`;
      if (content) {
        if (content.objectifs_principaux)
          text += `Objectifs : ${content.objectifs_principaux.substring(0, 200)}...\n`;
        if (content.phytotherapie_plantes)
          text += `Plantes : ${content.phytotherapie_plantes.substring(0, 200)}...\n`;
        if (content.complements)
          text += `Complements : ${content.complements.substring(0, 200)}...\n`;
      }
    }
    text += '\n';
  }

  // Notes de consultation
  if (ctx.consultationNotes) {
    text += `NOTES DE LA DERNIERE CONSULTATION :\n${ctx.consultationNotes}\n\n`;
  }

  return text;
}
