// Client Supabase de l'espace consultant (web).
//
// Il a sa propre clé de stockage (`afeia-consultant-auth-token`), distincte de celle du
// client praticien (`afeia-auth-token`, lib/supabase.ts). Les deux sessions coexistent
// donc dans le même navigateur : un praticien peut rester connecté à son espace tout en
// testant l'espace consultant (compte démo) dans un autre onglet.
//
// À utiliser dans tout ce qui tourne côté consultant : app/consultant/**, onboarding
// consultant, cartes de l'accueil consultant (objet connecté…).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const CONSULTANT_STORAGE_KEY = 'afeia-consultant-auth-token';

export const supabaseConsultant = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: CONSULTANT_STORAGE_KEY,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
