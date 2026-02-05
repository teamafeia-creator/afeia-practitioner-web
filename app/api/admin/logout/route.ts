import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/server/adminAuth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearAdminCookie(response);
  return response;
}
