import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { runAutomaticChecks } from '@/lib/server/verification';

/** Relance la vérification Pappers (et la lecture des documents). */
export async function POST(request: NextRequest, { params }: { params: { practitionerId: string } }) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  await runAutomaticChecks(params.practitionerId);
  return NextResponse.json({ ok: true });
}
