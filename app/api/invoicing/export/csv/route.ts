import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { generateInvoicesCSV } from '@/lib/invoicing/utils';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calculer les dates de debut/fin selon la periode
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const supabase = createSupabaseAdminClient();

    // Recuperer les factures
    const { data: invoices, error } = await supabase
      .from('consultation_invoices')
      .select('*')
      .eq('practitioner_id', userId)
      .gte('date_emission', startDate.toISOString())
      .lte('date_emission', now.toISOString())
      .not('date_emission', 'is', null)
      .order('numero', { ascending: true });

    if (error) throw error;

    const csv = generateInvoicesCSV((invoices || []) as ConsultationInvoice[]);

    const dateStr = now.toISOString().split('T')[0];

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="factures_${period}_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('Erreur export CSV:', error);
    return NextResponse.json(
      { message: "Erreur lors de l'export CSV" },
      { status: 500 }
    );
  }
}
