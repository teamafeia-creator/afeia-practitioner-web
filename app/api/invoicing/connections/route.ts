// GET /api/invoicing/connections — état des connexions aux outils de facturation (sans les clés).
import { NextRequest, NextResponse } from 'next/server';
import { listConnections } from '@/lib/invoicing/billing-connections';
import { practitionerIdFrom } from './auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const practitionerId = await practitionerIdFrom(request);
  if (!practitionerId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  try {
    return NextResponse.json({ connections: await listConnections(practitionerId) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    // Migration 20261113 non appliquée : aucune connexion possible, on ne bloque pas la page.
    console.error('[invoicing/connections] lecture impossible', { message: (e as Error).message });
    return NextResponse.json({ connections: [], unavailable: true });
  }
}
