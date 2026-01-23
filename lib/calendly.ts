const CALENDLY_HOST = 'calendly.com';

function stripCalendlyPrefix(value: string) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^calendly\.com\//i, '')
    .replace(/^@/, '')
    .trim();
}

export function normalizeCalendlyUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname.includes(CALENDLY_HOST)) {
        return null;
      }
      if (!url.pathname || url.pathname === '/') {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  const slug = stripCalendlyPrefix(trimmed);
  if (!slug) return null;
  return `https://${CALENDLY_HOST}/${slug}`;
}
