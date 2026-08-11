/**
 * Masquage systématique des données sensibles dans les rapports debug.
 *
 * Couvre : tokens (JWT, Bearer), cookies, en-têtes Authorization, mots de passe,
 * e-mails (conservés sous la forme `j***@domaine.fr`), et tout ce qui ressemble
 * à une clé API (Stripe secret, Google, whsec…).
 *
 * Le principe : on préfère sur-masquer plutôt que fuiter. Ces fonctions sont
 * idempotentes (les réappliquer ne dégrade pas un texte déjà masqué).
 */

const MASK = '***';

/** Noms de champs dont la valeur est toujours masquée dans un objet. */
const SENSITIVE_KEY =
  /(pass(?:word|wd)?|secret|token|authorization|auth|cookie|set-cookie|api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|bearer|session|jwt|pepper|service[-_]?role|client[-_]?secret|private[-_]?key)/i;

/** Motifs de chaînes remplacés par un masque. */
const STRING_PATTERNS: Array<[RegExp, string]> = [
  // JWT (3 segments base64url) — couvre les tokens Supabase (anon/service) et sessions.
  [/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, `${MASK}JWT${MASK}`],
  // Clés secrètes Stripe (jamais publishable pk_).
  [/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{6,}/g, `${MASK}STRIPE_SECRET${MASK}`],
  // Secret de webhook Stripe.
  [/\bwhsec_[A-Za-z0-9]{6,}/g, `${MASK}WEBHOOK_SECRET${MASK}`],
  // Clé API Google.
  [/\bAIza[0-9A-Za-z_-]{20,}/g, `${MASK}GOOGLE_KEY${MASK}`],
  // Valeur de header Authorization: Bearer xxx.
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${MASK}`],
];

/** Masque un e-mail en conservant la 1re lettre et le domaine : `j***@domaine.fr`. */
export function redactEmail(input: string): string {
  return input.replace(
    /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    (_match, first: string, domain: string) => `${first}${MASK}@${domain}`
  );
}

/** Masque une chaîne : e-mails puis motifs sensibles. */
export function redactString(input: string): string {
  if (!input) return input;
  let out = redactEmail(input);
  for (const [pattern, replacement] of STRING_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Masque les valeurs de query-string dont la clé est sensible, puis la chaîne entière. */
export function redactUrl(url: string): string {
  if (!url) return url;
  let out = url.replace(
    /([?&])([^=&]+)=([^&#]*)/g,
    (match, sep: string, key: string, value: string) => {
      if (SENSITIVE_KEY.test(decodeURIComponent(key))) {
        return `${sep}${key}=${MASK}`;
      }
      return match.replace(value, redactString(value));
    }
  );
  return redactString(out);
}

/** Masque récursivement un objet (clés sensibles => masque, chaînes => `redactString`). */
export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[profondeur max]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => redactObject(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? MASK : redactObject(val, depth + 1);
    }
    return out;
  }
  return String(value);
}

/** Masque un jeu d'en-têtes HTTP (Authorization, Cookie, X-Api-Key…). */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    out[key] = SENSITIVE_KEY.test(key) ? MASK : redactString(val);
  }
  return out;
}

/** Sérialise puis masque une valeur quelconque en une chaîne lisible et sûre. */
export function redactToString(value: unknown, maxLength = 1000): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(redactObject(value));
    } catch {
      text = String(value);
    }
  }
  text = redactString(text);
  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength)}… [tronqué, ${text.length} car.]`;
  }
  return text;
}
