import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminGuard';
import { runAdminDatabaseReset } from '@/lib/server/resetDatabase';

/**
 * POST /api/admin/reset-database
 * Supprime TOUTES les donnees de la base de donnees
 * Requiert : Admin + code de confirmation
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { confirmationCode } = body;

    const EXPECTED_CODE = 'FRESH_DATABASE_2026';

    if (confirmationCode !== EXPECTED_CODE) {
      console.warn(`Code de confirmation invalide fourni par ${guard.user.email}`);
      return NextResponse.json({ error: 'Code de confirmation invalide.' }, { status: 400 });
    }

    const adminEmail = guard.user.email ?? 'unknown';
    console.log(`RESET DATABASE initiee par ${adminEmail}`);

    const result = await runAdminDatabaseReset(adminEmail);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'La verification post-suppression a detecte des donnees restantes.',
          deleted: result.deleted,
          remaining: result.remaining,
          results: result.results
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Base de donnees reinitialisee avec succes.',
      totalDeleted: result.totalDeleted,
      deleted: result.deleted,
      remaining: result.remaining,
      results: result.results,
      performedBy: result.performedBy,
      timestamp: result.timestamp
    });
  } catch (err) {
    console.error('Exception reset-database:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
