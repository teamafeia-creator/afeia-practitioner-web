/**
 * GET/PUT /api/mobile/cycle/profile
 * Get or update the consultant's cycle profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from('cycle_profiles')
      .select('*')
      .eq('consultant_id', consultantId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Error fetching cycle profile:', error);
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.averageCycleLength != null) {
      const val = parseInt(body.averageCycleLength, 10);
      if (val >= 21 && val <= 45) {
        updateData.average_cycle_length = val;
      }
    }

    if (body.averagePeriodLength != null) {
      const val = parseInt(body.averagePeriodLength, 10);
      if (val >= 2 && val <= 8) {
        updateData.average_period_length = val;
      }
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from('cycle_profiles')
      .select('id')
      .eq('consultant_id', consultantId)
      .maybeSingle();

    let result;

    if (existing) {
      const { data, error } = await supabase
        .from('cycle_profiles')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Find practitioner for this consultant
      const { data: consultant } = await supabase
        .from('consultants')
        .select('practitioner_id')
        .eq('id', consultantId)
        .single();

      const { data, error } = await supabase
        .from('cycle_profiles')
        .insert({
          consultant_id: consultantId,
          practitioner_id: consultant?.practitioner_id ?? '',
          is_tracking: true,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ profile: result });
  } catch (error) {
    console.error('Error updating cycle profile:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
