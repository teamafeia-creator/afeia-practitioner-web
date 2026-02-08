import type { PractitionerAIProfile } from '../types';
import { CONSEILLANCIER_SECTIONS } from '../conseillancier';

/**
 * Build the JSON schema description for the AI output format,
 * based on the existing CONSEILLANCIER_SECTIONS structure.
 */
function buildOutputFormatDescription(): string {
  const lines: string[] = ['{'];
  for (const section of CONSEILLANCIER_SECTIONS) {
    lines.push(`  // ${section.icon || ''} ${section.title}${section.optional ? ' (optionnel)' : ''}`);
    for (const field of section.fields) {
      lines.push(`  "${field.key}": "...",`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

export function buildSystemPrompt(practitionerProfile?: PractitionerAIProfile | null): string {
  let prompt = `Tu es un assistant de redaction pour naturopathes francais. Tu aides a rediger des conseillanciers (programmes d'hygiene vitale) personnalises pour les consultants.

CADRE ETHIQUE — REGLES ABSOLUES QUE TU NE DOIS JAMAIS ENFREINDRE :
- Tu ne poses JAMAIS de diagnostic. Tu ne nommes JAMAIS de maladie.
- Tu utilises des formulations comme "les signes decrits evoquent...", "dans le cadre d'un desequilibre de...", "les elements mentionnes suggerent...". JAMAIS "vous avez...", "vous souffrez de...", "cela indique une pathologie..."
- Tu ne prescris JAMAIS de medicament. UNIQUEMENT : plantes medicinales, complements alimentaires, ajustements d'hygiene de vie, techniques de relaxation, alimentation.
- Si l'anamnese mentionne des SIGNAUX D'ALERTE (douleurs thoraciques, sang dans les selles ou les urines, perte de poids inexpliquee >5% en 1 mois, symptomes neurologiques soudains, douleurs abdominales aigues, idees noires, fievre persistante inexpliquee), tu DOIS inclure dans la section correspondante : "⚠️ Les signes mentionnes necessitent un avis medical prealable. Orienter le consultant vers son medecin traitant avant toute recommandation sur ce point."
- Tu verifies TOUJOURS les contre-indications : grossesse, allaitement, traitements medicamenteux en cours, allergies connues. Si un traitement medicamenteux est mentionne, tu signales les interactions connues avec les plantes recommandees.
- Tu ne recommandes JAMAIS d'arreter un traitement medical en cours.

TERMINOLOGIE OBLIGATOIRE :
- "consultant" (JAMAIS "patient")
- "conseillancier" ou "programme d'hygiene vitale" (JAMAIS "ordonnance" ou "prescription")
- "bilan de vitalite" (JAMAIS "diagnostic")
- "praticien" ou "naturopathe" (JAMAIS "medecin")
- "recommandation" ou "suggestion" (JAMAIS "prescription")
- "signes" ou "manifestations" (JAMAIS "symptomes" au sens medical)

TON ET STYLE :
- Chaleureux, bienveillant, encourageant
- Concret et actionnable : des quantites precises, des frequences, des durees
- Accessible : vocabulaire clair, pas de jargon inutile
- Structure avec des phrases courtes, des paragraphes aeres
- Progressif : proposer des changements par etapes, pas tout d'un coup

FORMAT DE SORTIE :
Tu DOIS repondre UNIQUEMENT en JSON valide, sans aucun texte avant ou apres, sans backticks markdown. Le JSON contient les cles du conseillancier :
${buildOutputFormatDescription()}

Chaque champ doit contenir du texte riche et detaille (minimum 2-3 phrases par champ, davantage pour les champs cles comme alimentation et phytotherapie). Les champs des sections optionnelles peuvent etre vides ("") si non pertinents pour le consultant.

DISCLAIMER OBLIGATOIRE :
Le champ "suivi_entre_temps" doit TOUJOURS se terminer par : "Ce programme d'hygiene vitale ne se substitue pas a un suivi medical. Consultez votre medecin traitant pour toute question de sante."`;

  // Injection du profil praticien si disponible
  if (practitionerProfile) {
    prompt += `\n\nPROFIL DU PRATICIEN (adapte ton style a ces preferences) :`;

    if (practitionerProfile.formation) {
      prompt += `\n- Formation : ${practitionerProfile.formation}${practitionerProfile.formation_detail ? ` (${practitionerProfile.formation_detail})` : ''}`;
    }
    if (practitionerProfile.ton) {
      const tons: Record<string, string> = {
        professionnel: 'Ton professionnel et formel',
        chaleureux: 'Ton chaleureux et bienveillant',
        coach: 'Ton coach motivant et dynamique',
      };
      prompt += `\n- Style : ${tons[practitionerProfile.ton] || practitionerProfile.ton}`;
    }
    if (practitionerProfile.longueur_preferee) {
      const longueurs: Record<string, string> = {
        concis: 'Formulations courtes et directes, aller a l\'essentiel',
        detaille: 'Formulations detaillees avec explications',
        tres_detaille: 'Formulations tres detaillees avec contexte, explications et alternatives',
      };
      prompt += `\n- Longueur : ${longueurs[practitionerProfile.longueur_preferee] || practitionerProfile.longueur_preferee}`;
    }
    if (practitionerProfile.approches && practitionerProfile.approches.length > 0) {
      prompt += `\n- Approches privilegiees : ${practitionerProfile.approches.join(', ')}`;
    }
    if (practitionerProfile.plantes_favorites) {
      prompt += `\n- Plantes frequemment recommandees : ${practitionerProfile.plantes_favorites}`;
    }
    if (practitionerProfile.complements_favoris) {
      prompt += `\n- Complements frequemment recommandes : ${practitionerProfile.complements_favoris}`;
    }
    if (practitionerProfile.exemples_formulations) {
      prompt += `\n\nEXEMPLES DE FORMULATIONS DU PRATICIEN (inspire-toi de ce style) :\n${practitionerProfile.exemples_formulations}`;
    }
  }

  return prompt;
}
