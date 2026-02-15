/**
 * GET /api/mobile/consultant/naturopathe-info
 * Get naturopathe info and consultation dates
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
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get consultant with practitioner (including calendly_url)
    const { data: consultant, error } = await supabase
      .from('consultants')
      .select(`
        practitioner_id,
        practitioners:practitioner_id (
          id, full_name, email, phone, avatar_url, specializations, calendly_url
        )
      `)
      .eq('id', consultantId)
      .single();

    if (error || !consultant) {
      return NextResponse.json(
        { message: 'Consultant non trouvé' },
        { status: 404 }
      );
    }

    // Get case file for consultation dates
    const { data: caseFile } = await supabase
      .from('case_files')
      .select('last_consultation_date, next_consultation_date')
      .eq('consultant_id', consultantId)
      .maybeSingle();

    // Get last completed appointment
    const { data: lastAppointment } = await supabase
      .from('appointments')
      .select('starts_at')
      .eq('consultant_id', consultantId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get next scheduled appointment
    const { data: nextAppointment } = await supabase
      .from('appointments')
      .select('starts_at')
      .eq('consultant_id', consultantId)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const practitioner = consultant.practitioners as any;

    return NextResponse.json({
      naturopathe: practitioner ? {
        id: practitioner.id,
        fullName: practitioner.full_name,
        email: practitioner.email,
        phone: practitioner.phone,
        avatarUrl: practitioner.avatar_url,
        specializations: practitioner.specializations || [],
      } : null,
      lastConsultation: lastAppointment?.starts_at || caseFile?.last_consultation_date || null,
      nextConsultation: nextAppointment?.starts_at || caseFile?.next_consultation_date || null,
      calendlyUrl: practitioner?.calendly_url || null,
    });
  } catch (error) {
    console.error('Error getting naturopathe info:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des informations' },
      { status: 500 }
    );
  }
}
