import { supabase } from './supabase';

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

export async function getCalendlyUrlForCurrentPractitioner(): Promise<string | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Veuillez vous reconnecter pour récupérer votre lien Calendly.');
  }

  const { data, error } = await supabase
    .from('practitioners')
    .select('calendly_url')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error('Impossible de récupérer le lien Calendly.');
  }

  if (!data?.calendly_url) {
    return null;
  }

  return normalizeCalendlyUrl(data.calendly_url);
}
