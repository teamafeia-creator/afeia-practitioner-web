import { NextResponse } from 'next/server';
import { generateInviteToken } from '../../../../lib/server/inviteTokens';

export async function GET() {
  return NextResponse.json({ token: generateInviteToken() });
}
