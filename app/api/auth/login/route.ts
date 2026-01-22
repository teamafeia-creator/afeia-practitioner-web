import { NextResponse } from 'next/server';

import { findUserByEmailPassword } from '@/lib/api-data';
import { signApiJwt } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : null;
  const password = typeof body?.password === 'string' ? body.password : null;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
  }

  const user = findUserByEmailPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
  }

  const token = await signApiJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });

  return NextResponse.json({ token, user });
}
