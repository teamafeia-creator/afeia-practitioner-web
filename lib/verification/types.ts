// Types partagés entre l'inscription, l'API admin et l'écran « Inscriptions ».

export type AccountStatus = 'pending_validation' | 'validated' | 'info_requested' | 'rejected';

export type CheckLevel = 'ok' | 'warn' | 'ko' | 'unavailable';

export type PappersRow = { label: string; value: string; mark: 'ok' | 'ko' | '' };

export type PappersResult = {
  status: CheckLevel;
  summary: string;
  rows: PappersRow[];
  url?: string;
};

export type ConcordanceRow = {
  label: string;
  idDoc: string;
  certificate: string;
  declared: string;
  result: 'ok' | 'warn' | 'ko';
};

export type ConcordanceResult = {
  status: CheckLevel;
  summary: string;
  rows: ConcordanceRow[];
};

export type VerificationChecks = { id?: boolean; siret?: boolean; doc?: boolean };

export const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: 'len', label: '12 caractères minimum', test: (v) => v.length >= 12 },
  { id: 'upper', label: 'Une majuscule', test: (v) => /[A-ZÀ-Ý]/.test(v) },
  { id: 'lower', label: 'Une minuscule', test: (v) => /[a-zß-ÿ]/.test(v) },
  { id: 'digit', label: 'Un chiffre', test: (v) => /\d/.test(v) },
  { id: 'special', label: 'Un caractère spécial', test: (v) => /[^A-Za-zÀ-ÿ0-9]/.test(v) },
];

export const passwordOk = (v: string) => PASSWORD_RULES.every((r) => r.test(v));

export const siretDigits = (v: string) => v.replace(/\D/g, '');

/** Contrôle de Luhn sur les 14 chiffres (La Poste fait exception). */
export function siretValid(v: string): boolean {
  const d = siretDigits(v);
  if (d.length !== 14) return false;
  if (d.startsWith('356000000')) return d.split('').reduce((s, c) => s + Number(c), 0) % 5 === 0;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(d[13 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export const formatSiret = (v: string) => {
  const d = siretDigits(v);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 14)].filter(Boolean).join(' ');
};

/** Comparaison de noms sans accents, casse ni ordre. */
export function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  return !!a.trim() && !!b.trim() && norm(a) === norm(b);
}

export const ACCEPTED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
