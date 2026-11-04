// POST   /api/invoicing/connections/:provider  { apiKey, vatMode }  — vérifie puis enregistre la clé
// DELETE /api/invoicing/connections/:provider                      — déconnecte et supprime la clé
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect, disconnect } from '@/lib/invoicing/billing-connections';
import { ConnectorError, PRACTITIONER_MESSAGES, isConnectorProvider } from '@/lib/invoicing/connectors';
import { practitionerIdFrom } from '../auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  apiKey: z.string().trim().min(10, 'Clé API trop courte').max(2000),
  vatMode: z.enum(['franchise', 'tva_20']).default('franchise'),
});

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const practitionerId = await practitionerIdFrom(request);
  if (!practitionerId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  if (!isConnectorProvider(params.provider)) {
    return NextResponse.json({ message: 'Cet outil ne propose pas de connexion par API.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Requête invalide' }, { status: 400 });

  try {
    const { accountLabel } = await connect(practitionerId, params.provider, parsed.data.apiKey, parsed.data.vatMode);
    return NextResponse.json({ ok: true, accountLabel });
  } catch (e) {
    if (e instanceof ConnectorError) {
      return NextResponse.json({ message: PRACTITIONER_MESSAGES[e.code], code: e.code }, { status: e.code === 'invalid_key' || e.code === 'forbidden' ? 400 : 502 });
    }
    console.error('[invoicing/connections] connexion impossible', { provider: params.provider, message: (e as Error).message });
    return NextResponse.json({ message: 'La connexion n’a pas pu être enregistrée.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { provider: string } }) {
  const practitionerId = await practitionerIdFrom(request);
  if (!practitionerId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  if (!isConnectorProvider(params.provider)) return NextResponse.json({ message: 'Outil inconnu' }, { status: 400 });
  try {
    await disconnect(practitionerId, params.provider);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[invoicing/connections] déconnexion impossible', { provider: params.provider, message: (e as Error).message });
    return NextResponse.json({ message: 'La déconnexion a échoué.' }, { status: 500 });
  }
}
