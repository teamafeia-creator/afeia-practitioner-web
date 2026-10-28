import type { ConcordanceResult, ConcordanceRow } from '@/lib/verification/types';
import { sameName } from '@/lib/verification/types';

// Lecture automatique des documents déposés à l'inscription.
// L'interface permet de brancher un service d'OCR (Mindee, Google Document AI, etc.)
// sans toucher au reste : il suffit d'implémenter DocumentExtractor et de le renvoyer
// depuis getDocumentExtractor(). Par défaut, aucune lecture : l'administrateur compare à la main.

export type IdDocumentFields = { lastName?: string; firstName?: string; birthDate?: string; expiresAt?: string };
export type CertificateFields = { fullName?: string; birthDate?: string; school?: string; year?: string };

export interface DocumentExtractor {
  readIdDocument(file: Buffer, mimeType: string): Promise<IdDocumentFields | null>;
  readCertificate(file: Buffer, mimeType: string): Promise<CertificateFields | null>;
}

class NoExtractor implements DocumentExtractor {
  async readIdDocument() {
    return null;
  }
  async readCertificate() {
    return null;
  }
}

export function getDocumentExtractor(): DocumentExtractor {
  return new NoExtractor();
}

type Declared = { fullName: string; school: string; year: number; pappersLeader?: string };

/** Compare ce qui a été lu sur les documents avec les informations déclarées (et Pappers). */
export function buildConcordance(
  id: IdDocumentFields | null,
  cert: CertificateFields | null,
  declared: Declared
): ConcordanceResult {
  if (!id && !cert) {
    return {
      status: 'unavailable',
      summary: 'Lecture automatique non disponible : comparez la pièce d’identité et le certificat avec les informations déclarées.',
      rows: [],
    };
  }
  const rows: ConcordanceRow[] = [];
  const idName = id ? [id.lastName?.toUpperCase(), id.firstName].filter(Boolean).join(' ') : '';
  const declaredName = declared.pappersLeader && !sameName(declared.pappersLeader, declared.fullName)
    ? `${declared.pappersLeader} (Pappers)`
    : declared.fullName;
  const nameOk = (!idName || sameName(idName, declared.fullName)) && (!cert?.fullName || sameName(cert.fullName, declared.fullName));
  const leaderOk = !declared.pappersLeader || sameName(declared.pappersLeader, declared.fullName);
  rows.push({ label: 'Nom et prénom', idDoc: idName || '—', certificate: cert?.fullName || '—', declared: declaredName, result: nameOk ? (leaderOk ? 'ok' : 'warn') : 'ko' });

  const births = [id?.birthDate, cert?.birthDate].filter(Boolean);
  rows.push({
    label: 'Date de naissance',
    idDoc: id?.birthDate || '—',
    certificate: cert?.birthDate || 'non indiquée',
    declared: '—',
    result: births.length < 2 ? 'warn' : births[0] === births[1] ? 'ok' : 'ko',
  });

  let validity: ConcordanceRow['result'] = 'warn';
  let validityText = '—';
  if (id?.expiresAt) {
    const exp = new Date(id.expiresAt);
    const ok = !Number.isNaN(exp.getTime()) && exp.getTime() > Date.now();
    validity = ok ? 'ok' : 'ko';
    const m = Number.isNaN(exp.getTime()) ? id.expiresAt : exp.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });
    validityText = ok ? `jusqu’au ${m}` : `expirée le ${m}`;
  }
  rows.push({ label: 'Validité de la pièce', idDoc: validityText, certificate: '—', declared: '—', result: validity });

  const certSchool = [cert?.school, cert?.year].filter(Boolean).join(', ');
  const declaredSchool = `${declared.school}, ${declared.year}`;
  rows.push({
    label: 'École et année',
    idDoc: '—',
    certificate: certSchool || '—',
    declared: declaredSchool,
    result: !cert?.year ? 'warn' : String(cert.year) === String(declared.year) ? 'ok' : 'warn',
  });

  const ko = rows.filter((r) => r.result === 'ko').length;
  const warn = rows.filter((r) => r.result === 'warn').length;
  if (ko) return { status: 'ko', summary: `${ko + warn} écart${ko + warn > 1 ? 's' : ''} entre les documents et les informations déclarées. Demandez un complément ou refusez la demande.`, rows };
  if (warn) return { status: 'warn', summary: `${warn} point${warn > 1 ? 's' : ''} à vérifier à la main.`, rows };
  return { status: 'ok', summary: 'Même identité sur les documents, le compte et Pappers. Contrôle d’identité coché automatiquement.', rows };
}
