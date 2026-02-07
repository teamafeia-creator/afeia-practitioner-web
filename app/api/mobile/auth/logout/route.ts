/**
 * POST /api/mobile/auth/logout
 * Logout endpoint for mobile app - primarily for logging/analytics
 * The actual token invalidation happens client-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getBearerToken(authHeader);

    if (token) {
      try {
        // Verify the token to get consultant info for logging
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(process.env.JWT_SECRET)
        );

        // Log the logout event (can be extended to store in database)
        console.log(`[AUTH] Consultant ${payload.consultantId} logged out at ${new Date().toISOString()}`);
      } catch {
        // Token might be expired, that's fine for logout
      }
    }

    // Always return success - client will clear tokens regardless
    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    // Still return success - logout should always "work" from client perspective
    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  }
}
