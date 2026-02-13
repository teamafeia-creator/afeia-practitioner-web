import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredEntries } from '@/lib/queries/waitlist';

/**
 * GET /api/waitlist/cleanup — Cron endpoint for cleaning up expired waitlist entries.
 * Secured by CRON_SECRET Bearer token.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
    }

    const deleted = await cleanupExpiredEntries();

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted > 0
        ? `${deleted} entree(s) nettoyee(s).`
        : 'Aucune entree a nettoyer.',
    });
  } catch (error) {
    console.error('Error in waitlist cleanup:', error);
    return NextResponse.json(
      { message: 'Erreur lors du nettoyage.' },
      { status: 500 }
    );
  }
}
