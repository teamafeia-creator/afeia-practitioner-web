/**
 * POL-11 · Reconstruit toutes les tables normalisées (sleep_sessions, hrv_nightly,
 * hr_samples, daily_activity) depuis wearable_raw.
 *
 * Usage : npm run wearables:rebuild [-- --yes] [-- --env-file .env.production.local]
 *
 * Étapes : vide les 4 tables (wearable_truncate_normalized), relit wearable_raw par pages
 * de 500 et réapplique les mappers. Idempotent : peut être relancé sans risque.
 * Requiert NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (service_role).
 */
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import type { WearableDataType, WearableProviderName } from '../lib/wearables/ingest-types';
import { writeNormalized } from '../lib/wearables/normalized';

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
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  process.exit(2);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

type RawRow = {
  id: string;
  consultant_id: string;
  provider: WearableProviderName;
  data_type: WearableDataType;
  data_date: string;
  payload: unknown;
};

async function confirm(): Promise<boolean> {
  if (values.yes) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Vider et reconstruire sleep_sessions, hrv_nightly, hr_samples, daily_activity sur ${new URL(url!).host} ? (tapez « oui ») `
  );
  rl.close();
  return answer.trim().toLowerCase() === 'oui';
}

async function main() {
  if (!(await confirm())) {
    console.log('Annulé.');
    return;
  }

  const { error: truncateError } = await supabase.rpc('wearable_truncate_normalized');
  if (truncateError) throw new Error(`vidage impossible : ${truncateError.message}`);
  console.log('→ Tables normalisées vidées.');

  const timezones = new Map<string, string | null>();
  const counts: Record<string, number> = { sleep_sessions: 0, hrv_nightly: 0, hr_samples: 0, daily_activity: 0 };
  let rawCount = 0;
  let failures = 0;
  let warnings = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('wearable_raw')
      .select('id, consultant_id, provider, data_type, data_date, payload')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`lecture wearable_raw impossible : ${error.message}`);
    const page = (data ?? []) as RawRow[];
    if (!page.length) break;

    const missing = [...new Set(page.map((r) => r.consultant_id))].filter((id) => !timezones.has(id));
    if (missing.length) {
      const { data: rows, error: tzError } = await supabase.from('consultants').select('id, timezone').in('id', missing);
      if (tzError) throw new Error(`lecture des fuseaux impossible : ${tzError.message}`);
      for (const id of missing) timezones.set(id, null);
      for (const r of rows ?? []) timezones.set(r.id as string, (r.timezone as string | null) ?? null);
    }

    for (const raw of page) {
      rawCount += 1;
      try {
        const res = await writeNormalized(supabase, {
          type: raw.data_type,
          provider: raw.provider,
          payload: raw.payload,
          consultantId: raw.consultant_id,
          sourceRawId: raw.id,
          timezone: timezones.get(raw.consultant_id),
          requestedDate: raw.data_date,
        });
        counts[res.table] += res.rows;
        warnings += res.warnings.length;
        for (const w of res.warnings) console.warn(`  ⚠ ${raw.id} : ${w}`);
      } catch (err) {
        failures += 1;
        console.error(`  ✗ ${raw.id} (${raw.data_type} ${raw.data_date}) : ${(err as Error).message}`);
      }
    }
    process.stdout.write(`  ${rawCount} enregistrements bruts traités…\n`);
    if (page.length < PAGE_SIZE) break;
  }

  console.log('\n✓ Reconstruction terminée');
  console.log(`  wearable_raw lus : ${rawCount}`);
  for (const [table, n] of Object.entries(counts)) console.log(`  ${table.padEnd(15)} : ${n} ligne(s)`);
  console.log(`  avertissements   : ${warnings}`);
  console.log(`  échecs           : ${failures}`);
  if (failures) process.exitCode = 1;
}

main().catch((err: Error) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
