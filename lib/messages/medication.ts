// Repère les questions de consultants qui portent sur un médicament ou un traitement.
// Le bandeau qui en découle est seulement informatif : c'est au médecin de juger.

const PATTERNS = [
  /m[ée]dicament/i,
  /traitement/i,
  /ordonnance/i,
  /comprim[ée]/i,
  /g[ée]lule/i,
  /pilule/i,
  /contraceptif|contraception/i,
  /antibio/i,
  /anti-?inflammatoire/i,
  /anti-?d[ée]presseur/i,
  /anxiolytique|somnif[èe]re|benzodiaz/i,
  /cortico|cortisone/i,
  /ibuprof[èe]ne|advil|nurofen/i,
  /parac[ée]tamol|doliprane|dafalgan|efferalgan/i,
  /aspirine|kard[ée]gic/i,
  /l[ée]vothyrox|thyrox/i,
  /m[ée]tformine|insuline/i,
  /statine|anticoagul|aspegic/i,
  /pharmacien|pharmacie/i,
];

export function mentionsMedication(text: string | null | undefined): boolean {
  if (!text) return false;
  return PATTERNS.some((p) => p.test(text));
}
