/**
 * GET/PUT /api/mobile/consultant/profile
 * Get or update consultant profile
 *
 * Uses the shared resolveConsultantId from lib/mobile-auth.ts
 * (dual-strategy: custom JWT + Supabase fallback).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get consultant
    const { data: consultant, error } = await supabase
      .from('consultants')
      .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
      .eq('id', consultantId)
      .maybeSingle();

    if (error) {
      console.error('[MOBILE API] DB error fetching consultant:', error.message);
      return NextResponse.json(
        { message: 'Erreur lors de la récupération du profil' },
        { status: 500 }
      );
    }

    if (!consultant) {
      return NextResponse.json(
        { message: 'Consultant non trouvé' },
        { status: 404 }
      );
    }

    // Auto-fix: activate consultant if not activated
    if (!consultant.activated) {
      const { data: activated } = await supabase
        .from('consultants')
        .update({ activated: true, activated_at: new Date().toISOString() })
        .eq('id', consultantId)
        .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
        .single();

      if (activated) {
        Object.assign(consultant, activated);
      }
    }

    // Auto-fix: assign practitioner if missing
    if (!consultant.practitioner_id) {
      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);

      if (practitioners?.[0]) {
        const { data: updated } = await supabase
          .from('consultants')
          .update({ practitioner_id: practitioners[0].id })
          .eq('id', consultantId)
          .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
          .single();

        if (updated) {
          Object.assign(consultant, updated);
        }
      }
    }

    // Get subscription info if premium
    let subscription = null;
    if (consultant.is_premium) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, cancel_at')
        .eq('consultant_id', consultantId)
        .eq('status', 'active')
        .maybeSingle();
      subscription = sub;
    }

    // Fetch practitioner separately
    let practitioner = null;
    if (consultant.practitioner_id) {
      const { data: prac } = await supabase
        .from('practitioners')
        .select('id, full_name, email, phone')
        .eq('id', consultant.practitioner_id)
        .single();

      if (prac) {
        practitioner = prac;
      }
    }

    const nameParts = consultant.name?.split(' ') || ['', ''];

    return NextResponse.json({
      consultant: {
        id: consultant.id,
        email: consultant.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: consultant.phone,
        isPremium: consultant.is_premium || false,
        subscription: subscription
          ? {
              id: subscription.id,
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
              cancelAt: subscription.cancel_at,
            }
          : null,
        naturopathe: practitioner
          ? {
              id: practitioner.id,
              fullName: practitioner.full_name,
              email: practitioner.email,
              phone: practitioner.phone,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[MOBILE API] GET profile exception:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    // Build update object
    const updates: Record<string, any> = {};
    if (firstName !== undefined || lastName !== undefined) {
      updates.name = `${firstName || ''} ${lastName || ''}`.trim();
    }
    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const { data: consultant, error } = await getSupabaseAdmin()
      .from('consultants')
      .update(updates)
      .eq('id', consultantId)
      .select('id, name, email, phone, is_premium')
      .single();

    if (error || !consultant) {
      return NextResponse.json(
        { message: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    const nameParts = consultant.name?.split(' ') || ['', ''];

    return NextResponse.json({
      consultant: {
        id: consultant.id,
        email: consultant.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: consultant.phone,
        isPremium: consultant.is_premium || false,
      },
    });
  } catch (error) {
    console.error('[MOBILE API] PUT profile exception:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
