import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie, getAdminEmailFromRequest } from '@/lib/server/adminAuth';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-log';

export async function POST(request: NextRequest) {
  const adminEmail = getAdminEmailFromRequest(request);

  const response = NextResponse.json({ success: true });
  clearAdminCookie(response);

  if (adminEmail) {
    await logAdminAction({
      adminEmail,
      action: 'admin.logout',
      ipAddress: getClientIp(request),
    });
  }

  return response;
}
