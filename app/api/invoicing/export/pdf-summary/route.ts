import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import type { ConsultationInvoice, PractitionerBillingSettings } from '@/lib/invoicing/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1A6C6C', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1A6C6C', marginBottom: 5 },
  subtitle: { fontSize: 10, textAlign: 'center', color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#333', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: '#666' },
  value: { fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 3, fontSize: 8 },
  col1: { width: '15%' },
  col2: { width: '15%' },
  col3: { width: '30%' },
  col4: { width: '15%', textAlign: 'right' },
  col5: { width: '25%', textAlign: 'right' },
  footer: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', fontSize: 8, color: '#666', textAlign: 'center' },
  totalBox: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 4, marginTop: 10 },
});

function formatCurrencyPdf(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function SummaryPDF({
  invoices,
  settings,
  periodLabel,
}: {
  invoices: ConsultationInvoice[];
  settings: PractitionerBillingSettings;
  periodLabel: string;
}) {
  const paidInvoices = invoices.filter((i) => i.status === 'paid' && !i.is_avoir);
  const avoirs = invoices.filter((i) => i.is_avoir);
  const pendingInvoices = invoices.filter((i) => i.status === 'issued');

  const totalFacture = paidInvoices.reduce((s, i) => s + Number(i.montant), 0);
  const totalAvoirs = avoirs.reduce((s, i) => s + Math.abs(Number(i.montant)), 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + Number(i.montant), 0);
  const net = totalFacture - totalAvoirs;

  // Repartition par moyen de paiement
  const byPayment: Record<string, number> = {};
  paidInvoices.forEach((i) => {
    const method = i.payment_method || 'autre';
    byPayment[method] = (byPayment[method] || 0) + Number(i.montant);
  });

  const paymentLabels: Record<string, string> = {
    especes: 'Especes',
    cheque: 'Cheque',
    cb: 'Carte bancaire',
    virement: 'Virement',
    stripe: 'Paiement en ligne',
    autre: 'Autre',
  };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, `RECAPITULATIF DE FACTURATION`),
        React.createElement(Text, { style: styles.subtitle }, periodLabel),
        React.createElement(
          Text,
          { style: [styles.subtitle, { marginTop: 5 }] },
          `${settings.siret} — ${settings.adresse_facturation}`
        )
      ),
      // Synthese
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'SYNTHESE'),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Factures emises'),
          React.createElement(Text, { style: styles.value }, String(invoices.filter((i) => !i.is_avoir).length))
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Montant total encaisse'),
          React.createElement(Text, { style: styles.value }, formatCurrencyPdf(totalFacture))
        ),
        avoirs.length > 0 &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, `Avoirs (${avoirs.length})`),
            React.createElement(Text, { style: styles.value }, `-${formatCurrencyPdf(totalAvoirs)}`)
          ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'En attente de paiement'),
          React.createElement(Text, { style: styles.value }, formatCurrencyPdf(totalPending))
        ),
        React.createElement(
          View,
          { style: [styles.totalBox, styles.row] },
          React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 12 } }, 'CA NET'),
          React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 12 } }, formatCurrencyPdf(net))
        )
      ),
      // Repartition par moyen de paiement
      Object.keys(byPayment).length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'REPARTITION PAR MOYEN DE PAIEMENT'),
          ...Object.entries(byPayment).map(([method, amount]) =>
            React.createElement(
              View,
              { style: styles.row, key: method },
              React.createElement(Text, { style: styles.label }, paymentLabels[method] || method),
              React.createElement(Text, { style: styles.value }, formatCurrencyPdf(amount))
            )
          )
        ),
      // Detail des factures
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'DETAIL DES FACTURES'),
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.col1 }, 'N°'),
          React.createElement(Text, { style: styles.col2 }, 'Date'),
          React.createElement(Text, { style: styles.col3 }, 'Consultant'),
          React.createElement(Text, { style: styles.col4 }, 'Montant'),
          React.createElement(Text, { style: styles.col5 }, 'Statut')
        ),
        ...invoices.slice(0, 50).map((inv) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: inv.id },
            React.createElement(Text, { style: styles.col1 }, inv.numero || '-'),
            React.createElement(
              Text,
              { style: styles.col2 },
              inv.date_emission ? new Date(inv.date_emission).toLocaleDateString('fr-FR') : '-'
            ),
            React.createElement(
              Text,
              { style: styles.col3 },
              `${inv.consultant_snapshot.prenom} ${inv.consultant_snapshot.nom}`
            ),
            React.createElement(Text, { style: styles.col4 }, formatCurrencyPdf(Number(inv.montant))),
            React.createElement(
              Text,
              { style: styles.col5 },
              inv.is_avoir ? 'Avoir' : inv.status === 'paid' ? 'Payee' : inv.status === 'issued' ? 'En attente' : inv.status
            )
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          null,
          `Document genere le ${new Date().toLocaleDateString('fr-FR')} par AFEIA`
        )
      )
    )
  );
}

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

    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        periodLabel = `T${quarter + 1} ${now.getFullYear()}`;
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = `Annee ${now.getFullYear()}`;
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        break;
    }

    const supabase = createSupabaseAdminClient();

    const [{ data: invoices, error }, { data: settings }] = await Promise.all([
      supabase
        .from('consultation_invoices')
        .select('*')
        .eq('practitioner_id', userId)
        .gte('date_emission', startDate.toISOString())
        .lte('date_emission', now.toISOString())
        .not('date_emission', 'is', null)
        .order('numero', { ascending: true }),
      supabase
        .from('practitioner_billing_settings')
        .select('*')
        .eq('practitioner_id', userId)
        .single(),
    ]);

    if (error) throw error;

    if (!settings) {
      return NextResponse.json(
        { message: 'Parametres de facturation non configures' },
        { status: 400 }
      );
    }

    const pdfElement = React.createElement(SummaryPDF, {
      invoices: (invoices || []) as ConsultationInvoice[],
      settings: settings as PractitionerBillingSettings,
      periodLabel,
    });

    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0]);

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recapitulatif_${period}_${now.toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur export PDF:', error);
    return NextResponse.json(
      { message: "Erreur lors de l'export PDF" },
      { status: 500 }
    );
  }
}
