// Liste de signaux d'alerte medicaux a detecter dans l'anamnese
const MEDICAL_ALERT_KEYWORDS = [
  'douleur thoracique',
  'douleurs thoraciques',
  'douleur poitrine',
  'sang dans les selles',
  'selles sanglantes',
  'rectorragie',
  'sang dans les urines',
  'hematurie',
  'perte de poids inexpliquee',
  'amaigrissement inexplique',
  'perte de connaissance',
  'syncope',
  'evanouissement',
  'idees suicidaires',
  'idees noires',
  'envie de mourir',
  'douleur abdominale aigue',
  'douleurs abdominales aigues',
  'fievre persistante',
  'fievre inexpliquee',
  'confusion mentale',
  'desorientation',
  'paralysie',
  'engourdissement soudain',
  'trouble de la vision soudain',
  'vision double soudaine',
  'essoufflement au repos',
  'dyspnee de repos',
  'grosseur',
  'masse',
  'tumeur',
  'nodule',
];

// Noms de medicaments courants (pour verifier que l'IA n'en prescrit pas)
const MEDICATION_KEYWORDS = [
  'paracetamol',
  'ibuprofene',
  'aspirine',
  'doliprane',
  'efferalgan',
  'advil',
  'nurofen',
  'amoxicilline',
  'augmentin',
  'lexomil',
  'xanax',
  'prozac',
  'deroxat',
  'levothyrox',
  'metformine',
  'atorvastatine',
  'omeprazole',
  'pantoprazole',
  'ramipril',
  'amlodipine',
  'bisoprolol',
  'prednisolone',
  'cortisone',
  'tramadol',
  'codeine',
  'morphine',
  'oxycodone',
];

// Termes de diagnostic interdits
const DIAGNOSIS_KEYWORDS = [
  'vous avez une',
  'vous souffrez de',
  'vous etes atteint',
  'diagnostic de',
  'diagnostique',
  'maladie de',
  'syndrome de',
  'pathologie',
  'vous faites une',
];

export interface SafetyCheck {
  hasMedicationInOutput: boolean;
  medicationsFound: string[];
  hasDiagnosisLanguage: boolean;
  diagnosisFound: string[];
  hasDisclaimer: boolean;
}

/**
 * Verifie le contexte d'entree pour detecter des signaux d'alerte medicaux.
 * Appele AVANT l'appel a l'API IA.
 */
export function checkInputSafety(contextText: string): {
  hasMedicalAlerts: boolean;
  alerts: string[];
} {
  const lowerText = contextText.toLowerCase();
  const alerts: string[] = [];

  for (const keyword of MEDICAL_ALERT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      alerts.push(keyword);
    }
  }

  return { hasMedicalAlerts: alerts.length > 0, alerts };
}

/**
 * Verifie la sortie de l'IA pour detecter des violations du cadre ethique.
 * Appele APRES reception de la reponse de l'API IA.
 */
export function checkOutputSafety(outputText: string): SafetyCheck {
  const lowerOutput = outputText.toLowerCase();

  // Verifier la presence de noms de medicaments
  const medicationsFound: string[] = [];
  for (const med of MEDICATION_KEYWORDS) {
    if (lowerOutput.includes(med.toLowerCase())) {
      medicationsFound.push(med);
    }
  }

  // Verifier le langage de diagnostic
  const diagnosisFound: string[] = [];
  for (const diag of DIAGNOSIS_KEYWORDS) {
    if (lowerOutput.includes(diag.toLowerCase())) {
      diagnosisFound.push(diag);
    }
  }

  // Verifier la presence du disclaimer
  const hasDisclaimer =
    lowerOutput.includes('ne se substitue pas') ||
    lowerOutput.includes('suivi medical') ||
    lowerOutput.includes('medecin traitant');

  return {
    hasMedicationInOutput: medicationsFound.length > 0,
    medicationsFound,
    hasDiagnosisLanguage: diagnosisFound.length > 0,
    diagnosisFound,
    hasDisclaimer,
  };
}

/**
 * Nettoie la sortie IA si des problemes sont detectes.
 * Ajoute le disclaimer s'il manque, signale les medicaments.
 */
export function sanitizeOutput(
  output: Record<string, string>,
  safetyCheck: SafetyCheck
): Record<string, string> {
  const sanitized = { ...output };

  // Ajouter le disclaimer a la section suivi s'il manque
  if (!safetyCheck.hasDisclaimer && sanitized.suivi_entre_temps) {
    sanitized.suivi_entre_temps +=
      "\n\nCe programme d'hygiene vitale ne se substitue pas a un suivi medical. Consultez votre medecin traitant pour toute question de sante.";
  }

  // Si des medicaments sont trouves dans l'output, ajouter un avertissement dans notes_libres
  if (safetyCheck.hasMedicationInOutput) {
    const warning = `⚠️ ATTENTION PRATICIEN : L'IA a mentionne des medicaments (${safetyCheck.medicationsFound.join(', ')}). Veuillez verifier et supprimer ces mentions. Le conseillancier ne doit contenir que des recommandations d'hygiene de vie, plantes et complements.`;
    sanitized.notes_libres = warning + (sanitized.notes_libres ? '\n\n' + sanitized.notes_libres : '');
  }

  return sanitized;
}
