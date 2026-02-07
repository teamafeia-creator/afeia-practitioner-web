import { createAdminClient } from '@/lib/supabase/admin';

type ResetResultRow = {
  table: string;
  deleted: number;
  remaining: number | null;
  error?: string;
};

export type ResetDatabaseResult = {
  ok: boolean;
  totalDeleted: number;
  deleted: Record<string, number>;
  remaining: Record<string, number | null>;
  results: ResetResultRow[];
  performedBy: string;
  timestamp: string;
};

const TABLES_TO_CLEAR = [
  'billing_history',
  'invoices',
  'payment_methods',
  'subscriptions',
  'complement_tracking',
  'complements',
  'journal_entries',
  'daily_journals',
  'wearable_insights',
  'wearable_summaries',
  'plan_sections',
  'plan_versions',
  'consultant_plans',
  'care_plans',
  'plans',
  'anamnesis_history',
  'consultant_anamnesis',
  'anamnese_instances',
  'anamneses',
  'preliminary_questionnaires',
  'messages',
  'notifications',
  'practitioner_notes',
  'consultant_analysis_results',
  'appointments',
  'consultations',
  'case_files',
  'consultant_questionnaire_codes',
  'otp_codes',
  'consultant_memberships',
  'consultant_invites',
  'consultant_invitations',
  'consultants'
];

export async function runAdminDatabaseReset(performedBy: string): Promise<ResetDatabaseResult> {
  const supabase = createAdminClient();
  const results: ResetResultRow[] = [];
  const deletedByTable: Record<string, number> = {};
  const remainingByTable: Record<string, number | null> = {};
  let ok = true;

  for (const table of TABLES_TO_CLEAR) {
    try {
      const { count: countBefore, error: countBeforeError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (countBeforeError) {
        if (countBeforeError.code === '42P01') {
          continue;
        }
        console.error(`Erreur comptage ${table}:`, countBeforeError);
        results.push({ table, deleted: 0, remaining: null, error: countBeforeError.message });
        ok = false;
        continue;
      }

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        if (deleteError.code === '42P01') {
          continue;
        }
        console.error(`Erreur suppression ${table}:`, deleteError);
        results.push({ table, deleted: 0, remaining: null, error: deleteError.message });
        ok = false;
        continue;
      }

      const { count: countAfter, error: countAfterError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (countAfterError && countAfterError.code !== '42P01') {
        console.error(`Erreur verification ${table}:`, countAfterError);
        results.push({
          table,
          deleted: countBefore ?? 0,
          remaining: null,
          error: countAfterError.message
        });
        ok = false;
        continue;
      }

      const deletedCount = countBefore ?? 0;
      const remaining = countAfter ?? 0;
      deletedByTable[table] = deletedCount;
      remainingByTable[table] = remaining;
      console.log(`${table}: ${deletedCount} lignes supprimees`);
      results.push({ table, deleted: deletedCount, remaining });

      if (remaining > 0) {
        ok = false;
      }
    } catch (err) {
      console.error(`Exception suppression ${table}:`, err);
      results.push({ table, deleted: 0, remaining: null, error: String(err) });
      ok = false;
    }
  }

  try {
    const { data: practitioners } = await supabase.from('practitioners').select('id');
    const practitionerIds = new Set(practitioners?.map((row) => row.id) || []);

    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.error('Erreur liste users:', listError);
    } else if (listData) {
      let deletedUsers = 0;
      for (const user of listData.users) {
        if (!practitionerIds.has(user.id)) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          if (!deleteError) {
            deletedUsers++;
          }
        }
      }
      console.log(`${deletedUsers} utilisateurs non-praticiens supprimes`);
      results.push({
        table: 'auth.users (non-practitioners)',
        deleted: deletedUsers,
        remaining: null
      });
      deletedByTable['auth.users (non-practitioners)'] = deletedUsers;
    }
  } catch (err) {
    console.error('Erreur suppression auth users:', err);
  }

  const totalDeleted = results.reduce((sum, row) => sum + row.deleted, 0);
  const timestamp = new Date().toISOString();

  console.log(`FRESH DATABASE TERMINEE : ${totalDeleted} lignes supprimees au total`);
  console.log(`   Effectuee par : ${performedBy}`);
  console.log(`   Date : ${timestamp}`);

  return {
    ok,
    totalDeleted,
    deleted: deletedByTable,
    remaining: remainingByTable,
    results,
    performedBy,
    timestamp
  };
}
