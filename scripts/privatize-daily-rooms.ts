/**
 * Visio intégrée · rend privées les salles Daily déjà créées (avant le passage en salles privées).
 *
 * Usage (une seule fois, après la migration 20261111_video_join_token.sql) :
 *   npm run video:privatize [-- --yes] [-- --env-file .env.production.local]
 *
 * Parcourt les rendez-vous à venir (fin dans le futur) qui ont une salle (video_room_name)
 * et appelle Daily (POST /rooms/{nom} { privacy: 'private' }). Rejouable sans risque.
 * Requiert NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DAILY_API_KEY.
 */
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { privatizeDailyRoom } from '../lib/server/daily';

const PAGE_SIZE = 500;

const { values } = parseArgs({
  options: { yes: { type: 'boolean', default: false }, 'env-file': { type: 'string' } },
});

const envFiles = values['env-file'] ? [values['env-file']] : ['.env.local', '.env'];
for (const file of envFiles) {
  if (existsSync(file)) process.loadEnvFile(file);
  else if (values['env-file']) throw new Error(`Fichier d'env introuvable : ${file}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !process.env.DAILY_API_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DAILY_API_KEY sont requis.');
  process.exit(2);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const now = new Date().toISOString();
  const rooms: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, video_room_name')
      .not('video_room_name', 'is', null)
      .gt('ends_at', now)
      .order('starts_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) if (row.video_room_name) rooms.push(row.video_room_name as string);
    if (!data || data.length < PAGE_SIZE) break;
  }

  console.log(`${rooms.length} salle(s) Daily à rendre privée(s).`);
  if (rooms.length === 0) return;

  if (!values.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Continuer ? (oui/non) ');
    rl.close();
    if (!/^o(ui)?$/i.test(answer.trim())) {
      console.log('Abandon.');
      return;
    }
  }

  let ok = 0;
  const failed: string[] = [];
  for (const room of rooms) {
    if (await privatizeDailyRoom(room)) ok++;
    else failed.push(room);
  }
  console.log(`${ok} salle(s) rendue(s) privée(s).`);
  if (failed.length) {
    console.error(`${failed.length} échec(s) (salle expirée ou supprimée chez Daily ?) :\n${failed.join('\n')}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
