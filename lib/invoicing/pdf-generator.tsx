import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ConsultationInvoice, InvoiceDocumentType } from './types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  numero: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 3,
  },
  dateEmission: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  column: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    color: '#333',
  },
  text: {
    marginBottom: 3,
    lineHeight: 1.4,
  },
  textBold: {
    fontWeight: 'bold',
  },
  prestationBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  montantLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
  },
  totalBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mentionTva: {
    fontSize: 9,
    marginTop: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  paiementBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 20,
  },
});

function formatDatePdf(isoDate: string | null): string {
  if (!isoDate) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function formatCurrencyPdf(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function getPaymentMethodLabelPdf(method: string | null): string {
  const labels: Record<string, string> = {
    especes: 'especes',
    cheque: 'cheque',
    cb: 'carte bancaire',
    virement: 'virement',
    stripe: 'paiement en ligne',
  };
  return labels[method || ''] || 'autre moyen';
}

interface InvoicePDFDocumentProps {
  invoice: ConsultationInvoice;
  documentType?: InvoiceDocumentType;
}

export function InvoicePDFDocument({
  invoice,
  documentType = 'facture',
}: InvoicePDFDocumentProps) {
  const { practitioner_snapshot, consultant_snapshot } = invoice;

  const documentTitle =
    documentType === 'recu'
      ? 'RECU'
      : documentType === 'facture-recu'
        ? 'FACTURE-RECU'
        : 'FACTURE';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{documentTitle}</Text>
          <Text style={styles.numero}>
            N° {invoice.numero || 'BROUILLON'}
          </Text>
          <Text style={styles.dateEmission}>
            Emise le{' '}
            {formatDatePdf(invoice.date_emission || invoice.created_at)}
          </Text>
        </View>

        {/* Praticien + Consultant */}
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Praticien</Text>
            <Text style={[styles.text, styles.textBold]}>
              {practitioner_snapshot.prenom} {practitioner_snapshot.nom}
            </Text>
            <Text style={styles.text}>Naturopathe</Text>
            <Text style={styles.text}>
              {practitioner_snapshot.adresse}
            </Text>
            <Text style={[styles.text, { marginTop: 5 }]}>
              SIRET : {practitioner_snapshot.siret}
            </Text>
            <Text style={styles.text}>
              {practitioner_snapshot.statut_juridique}
            </Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Consultant</Text>
            <Text style={[styles.text, styles.textBold]}>
              {consultant_snapshot.prenom} {consultant_snapshot.nom}
            </Text>
            {consultant_snapshot.adresse && (
              <Text style={styles.text}>
                {consultant_snapshot.adresse}
              </Text>
            )}
          </View>
        </View>

        {/* Prestation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prestation</Text>
          <View style={styles.prestationBox}>
            <Text style={[styles.text, styles.textBold]}>
              {invoice.description}
            </Text>
            {invoice.consultation_id && (
              <Text style={[styles.text, { marginTop: 5, fontSize: 9 }]}>
                Date de la consultation :{' '}
                {formatDatePdf(
                  invoice.date_emission || invoice.created_at
                )}
              </Text>
            )}
            <View style={styles.montantLine}>
              <Text>Montant</Text>
              <Text style={styles.textBold}>
                {formatCurrencyPdf(invoice.montant)}
              </Text>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <View style={styles.totalLine}>
            <Text>TOTAL</Text>
            <Text>{formatCurrencyPdf(invoice.montant)}</Text>
          </View>
          <Text style={styles.mentionTva}>
            {practitioner_snapshot.mention_tva}
          </Text>
        </View>

        {/* Paiement */}
        {invoice.status === 'paid' && invoice.payment_date && (
          <View style={styles.paiementBox}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>
              Paiement
            </Text>
            <Text style={styles.text}>
              Payee le {formatDatePdf(invoice.payment_date)} par{' '}
              {getPaymentMethodLabelPdf(invoice.payment_method)}
            </Text>
            {invoice.payment_notes && (
              <Text style={[styles.text, { fontSize: 9, marginTop: 3 }]}>
                {invoice.payment_notes}
              </Text>
            )}
          </View>
        )}

        {/* Conditions */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>
            Conditions de reglement
          </Text>
          <Text style={styles.smallText}>
            En cas de retard de paiement, penalites de retard : 3 fois
            le taux d&apos;interet legal (soit 3,87% en 2026).
          </Text>
          <Text style={[styles.smallText, { marginTop: 3 }]}>
            Indemnite forfaitaire pour frais de recouvrement : 40 EUR
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Document genere par AFEIA</Text>
          <Text style={{ marginTop: 3 }}>
            Cette facture peut etre transmise a votre mutuelle pour un
            eventuel remboursement partiel.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
