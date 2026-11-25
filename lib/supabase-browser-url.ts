// URL de Supabase vue par le NAVIGATEUR.
//
// En production : NEXT_PUBLIC_SUPABASE_URL tel quel.
// En local, pour tester depuis un téléphone via un tunnel (outils-windows/partager-sur-telephone.cmd),
// NEXT_PUBLIC_SUPABASE_VIA_APP=1 fait passer Supabase par le même domaine que l'app
// (`/supabase/...`, relayé par next.config.mjs) : le téléphone n'a pas accès au 127.0.0.1 du PC.
export function getBrowserSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (process.env.NEXT_PUBLIC_SUPABASE_VIA_APP === '1' && typeof window !== 'undefined') {
    return `${window.location.origin}/supabase`;
  }
  return url;
}
