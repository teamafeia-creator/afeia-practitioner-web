import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

/**
 * POST /api/admin/fresh-database
 * Supprime TOUTES les donnees de la base de donnees
 * Requiert : Admin + code de confirmation
 */
export async function POST(request: NextRequest) {
  // Verifier que c'est autorise en developpement seulement
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_FRESH_DATABASE !== 'true') {
    return NextResponse.json(
      { error: 'Fonctionnalite desactivee en production.' },
      { status: 403 }
    );
  }

  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    // Verifier le code de confirmation
    const body = await request.json();
    const { confirmationCode } = body;

    const EXPECTED_CODE = 'FRESH_DATABASE_2026';

    if (confirmationCode !== EXPECTED_CODE) {
      console.warn(`Code de confirmation invalide fourni par ${guard.user.email}`);
      return NextResponse.json({ error: 'Code de confirmation invalide.' }, { status: 400 });
    }

    console.log(`FRESH DATABASE initiee par ${guard.user.email}`);

    const supabase = createAdminClient();

    // Liste des tables a vider (ordre important pour les foreign keys)
    const tablesToClear = [
      // Dependances en premier (tables avec foreign keys)
      'billing_history',
      'invoices',
      'payment_methods',
      'subscriptions',
      'complement_tracking',
      'complements',
      'daily_journals',
      'journal_entries',
      'wearable_insights',
      'wearable_summaries',
      'plan_sections',
      'plan_versions',
      'plans',
      'patient_plans',
      'care_plans',
      'anamnesis_history',
      'patient_anamnesis',
      'anamnese_instances',
      'anamneses',
      'preliminary_questionnaires',
      'messages',
      'notifications',
      'practitioner_notes',
      'patient_analysis_results',
      'appointments',
      'consultations',
      'case_files',
      'patient_questionnaire_codes',
      'otp_codes',
      'patient_memberships',
      'patient_invites',
      'patient_invitations',
      // Tables principales en dernier
      'patients',
      // Note : On ne supprime PAS practitioners (lies a auth.users)
    ];

    const results: { table: string; deleted: number; error?: string }[] = [];

    // Supprimer les donnees de chaque table
    for (const table of tablesToClear) {
      try {
        // Compter d'abord les lignes a supprimer
        const { count: countBefore } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });

        // Supprimer toutes les lignes
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          // Ignorer les erreurs si la table n'existe pas
          if (error.code !== '42P01') {
            console.error(`Erreur suppression ${table}:`, error);
            results.push({ table, deleted: 0, error: error.message });
          }
        } else {
          const deletedCount = countBefore ?? 0;
          console.log(`${table}: ${deletedCount} lignes supprimees`);
          results.push({ table, deleted: deletedCount });
        }
      } catch (err) {
        console.error(`Exception suppression ${table}:`, err);
        results.push({ table, deleted: 0, error: String(err) });
      }
    }

    // Optionnel : Supprimer tous les utilisateurs auth SAUF les praticiens
    try {
      // Recuperer tous les IDs de praticiens
      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id');

      const practitionerIds = new Set(practitioners?.map(p => p.id) || []);

      // Recuperer tous les users
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        console.error('Erreur liste users:', listError);
      } else {
        let deletedUsers = 0;
        for (const user of listData.users) {
          // Ne pas supprimer les praticiens
          if (!practitionerIds.has(user.id)) {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (!deleteError) {
              deletedUsers++;
            }
          }
        }
        console.log(`${deletedUsers} utilisateurs non-praticiens supprimes`);
        results.push({ table: 'auth.users (non-practitioners)', deleted: deletedUsers });
      }
    } catch (err) {
      console.error('Erreur suppression auth users:', err);
    }

    // Logger l'operation
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    console.log(`FRESH DATABASE TERMINEE : ${totalDeleted} lignes supprimees au total`);
    console.log(`   Effectuee par : ${guard.user.email}`);
    console.log(`   Date : ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Base de donnees reinitialisee avec succes.',
      totalDeleted,
      results,
      performedBy: guard.user.email,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Exception fresh-database:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
