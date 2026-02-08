import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  return NextResponse.json({
    isAdmin: true,
    email: guard.user.email,
    role: guard.user.role,
  });
}
