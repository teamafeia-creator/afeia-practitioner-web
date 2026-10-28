import { sameName, siretDigits, type PappersResult, type PappersRow } from '@/lib/verification/types';

// Vérification du SIRET via l'API Pappers (https://www.pappers.fr/api/documentation).
// La clé PAPPERS_API_KEY reste côté serveur. Sans clé, le contrôle est « indisponible »
// et l'administrateur vérifie à la main.

type PappersPerson = { nom_complet?: string; prenom?: string; nom?: string; personne_morale?: boolean };
type PappersCompany = {
  nom_entreprise?: string;
  denomination?: string;
  forme_juridique?: string;
  personne_morale?: boolean;
  nom?: string;
  prenom?: string;
  code_naf?: string;
  libelle_code_naf?: string;
  date_creation?: string;
  entreprise_cessee?: boolean;
  representants?: PappersPerson[];
  etablissement?: { etablissement_cesse?: boolean; date_cessation?: string | null; ville?: string; code_postal?: string; siret?: string };
  etablissements?: { siret?: string; etablissement_cesse?: boolean; date_cessation?: string | null; ville?: string; code_postal?: string }[];
  siege?: { ville?: string; code_postal?: string };
};

const fmtMonth = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
};
const fmtDay = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const cityMatch = (a: string, b?: string) => {
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return !!b && !!a.trim() && (n(b).includes(n(a)) || n(a).includes(n(b)));
};

export async function checkSiretWithPappers(input: { siret: string; fullName: string; city: string }): Promise<PappersResult> {
  const key = process.env.PAPPERS_API_KEY;
  const siret = siretDigits(input.siret);
  if (!key) {
    return {
      status: 'unavailable',
      summary: 'Vérification automatique indisponible (clé Pappers non configurée). Vérifiez le SIRET à la main.',
      rows: [],
      url: `https://www.pappers.fr/recherche?q=${siret}`,
    };
  }

  let company: PappersCompany | null = null;
  try {
    const res = await fetch(`https://api.pappers.fr/v2/entreprise?siret=${siret}`, {
      headers: { 'api-key': key },
      cache: 'no-store',
    });
    if (res.status === 404) {
      return { status: 'ko', summary: 'Aucun établissement trouvé pour ce SIRET. Demandez un numéro correct ou refusez la demande.', rows: [] };
    }
    if (!res.ok) throw new Error(`Pappers ${res.status}`);
    company = (await res.json()) as PappersCompany;
  } catch {
    return {
      status: 'unavailable',
      summary: 'Pappers n’a pas répondu. Relancez la vérification dans quelques minutes ou vérifiez à la main.',
      rows: [],
      url: `https://www.pappers.fr/recherche?q=${siret}`,
    };
  }

  type Etab = { etablissement_cesse?: boolean; date_cessation?: string | null; ville?: string; code_postal?: string };
  const etab: Etab =
    company.etablissements?.find((e) => e.siret === siret) ?? company.etablissement ?? company.siege ?? {};
  const closed = !!etab.etablissement_cesse || !!company.entreprise_cessee;
  const closedOn = etab.date_cessation ?? null;

  const leaders: string[] = [];
  if (company.personne_morale === false && (company.prenom || company.nom)) {
    leaders.push([company.prenom, company.nom].filter(Boolean).join(' '));
  }
  for (const r of company.representants ?? []) {
    if (r.personne_morale) continue;
    const n = r.nom_complet || [r.prenom, r.nom].filter(Boolean).join(' ');
    if (n) leaders.push(n);
  }
  const leaderOk = leaders.some((l) => sameName(l, input.fullName));
  const leader = leaders.find((l) => sameName(l, input.fullName)) ?? leaders[0] ?? '—';
  const place = [etab.ville, etab.code_postal ? `(${etab.code_postal.slice(0, 2)})` : ''].filter(Boolean).join(' ') || '—';
  const placeOk = cityMatch(input.city, etab.ville);
  const name = company.denomination || company.nom_entreprise || '—';

  const rows: PappersRow[] = [
    { label: 'Établissement', value: closed ? `Fermé${closedOn ? ` le ${fmtDay(closedOn)}` : ''}` : 'Actif', mark: closed ? 'ko' : 'ok' },
    { label: 'Dénomination', value: company.forme_juridique ? `${name} (${company.forme_juridique})` : name, mark: '' },
    { label: 'Dirigeant', value: leader, mark: leaderOk ? 'ok' : 'ko' },
    { label: 'Code NAF', value: [company.code_naf, company.libelle_code_naf].filter(Boolean).join(' · ') || '—', mark: '' },
    { label: 'Adresse', value: place, mark: placeOk ? 'ok' : '' },
    { label: 'Création', value: fmtMonth(company.date_creation), mark: '' },
  ];

  const url = `https://www.pappers.fr/entreprise/${siret.slice(0, 9)}`;
  if (closed) {
    return { status: 'ko', summary: 'Établissement fermé : ce SIRET n’est plus actif. Demandez un SIRET à jour ou refusez la demande.', rows, url };
  }
  if (!leaderOk) {
    return { status: 'warn', summary: 'SIRET actif, mais le dirigeant enregistré ne correspond pas au nom déclaré. Vérifiez à la main avant de cocher.', rows, url };
  }
  return { status: 'ok', summary: 'SIRET trouvé, établissement actif, dirigeant identique au nom déclaré. Contrôle coché automatiquement.', rows, url };
}
