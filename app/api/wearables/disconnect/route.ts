// POST /api/wearables/disconnect   { "deleteData": true }
// Déconnexion de l'objet connecté par le patient lui-même (web ou mobile, Authorization: Bearer).
// Les sessions ne sont pas dans des cookies (localStorage web, JWT mobile) : une server action ne
// pourrait pas identifier l'utilisateur, d'où une route authentifiée comme /api/wearables/polar/connect.
// Le consultant est déduit du jeton (resolveConsultantId) : on ne peut déconnecter que soi-même.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { disconnectPolar } from '@/lib/wearables/polar/disconnect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  let deleteData = true; // suppression par défaut
  try {
    const body = (await request.json()) as { deleteData?: unknown };
    if (typeof body?.deleteData === 'boolean') deleteData = body.deleteData;
  } catch {
    // corps absent : valeur par défaut
  }

  try {
    const result = await disconnectPolar(consultantId, { deleteData });
    if (result.status === 'not_connected') {
      return NextResponse.json({ error: 'Aucun objet connecté.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleteData, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[wearables/disconnect] échec', { consultantId, message: (error as Error).message });
    return NextResponse.json({ error: 'La déconnexion a échoué. Réessayez.' }, { status: 500 });
  }
}
