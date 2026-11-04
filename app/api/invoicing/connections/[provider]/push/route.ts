// POST /api/invoicing/connections/:provider/push  { appointmentId }
// Crée dans l'outil connecté le brouillon de facture d'une séance terminée.
// Le brouillon n'est ni finalisé ni envoyé : le praticien le valide dans son outil.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pushSession } from '@/lib/invoicing/billing-connections';
import { ConnectorError, PRACTITIONER_MESSAGES, isConnectorProvider } from '@/lib/invoicing/connectors';
import { practitionerIdFrom } from '../../auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ appointmentId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const practitionerId = await practitionerIdFrom(request);
  if (!practitionerId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  if (!isConnectorProvider(params.provider)) return NextResponse.json({ message: 'Outil inconnu' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Séance invalide' }, { status: 400 });

  try {
    const r = await pushSession(practitionerId, params.provider, parsed.data.appointmentId);
    switch (r.status) {
      case 'created':
        return NextResponse.json({ ok: true, externalId: r.externalId, url: r.url });
      case 'already':
        return NextResponse.json({ message: 'Un brouillon existe déjà pour cette séance.' }, { status: 409 });
      case 'not_connected':
        return NextResponse.json({ message: 'Votre outil n’est plus connecté.' }, { status: 409 });
      case 'no_price':
        return NextResponse.json({ message: 'Ce type de consultation n’a pas de tarif : ajoutez-le dans vos réglages.' }, { status: 422 });
      default:
        return NextResponse.json({ message: 'Séance introuvable ou pas encore terminée.' }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof ConnectorError) {
      console.warn('[invoicing/push] refus de l’outil', { provider: params.provider, message: e.message });
      return NextResponse.json({ message: PRACTITIONER_MESSAGES[e.code], code: e.code }, { status: 502 });
    }
    console.error('[invoicing/push] échec', { provider: params.provider, message: (e as Error).message });
    return NextResponse.json({ message: 'Le brouillon n’a pas pu être créé.' }, { status: 500 });
  }
}
