import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { styles, COLORS } from './plan-pdf-styles';

export type DrawingPdfData = {
  consultantName: string;
  practitionerName: string;
  title: string;
  date: string;
  snapshotBase64: string;
  notes: string | null;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DrawingPdfDocument({ data }: { data: DrawingPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Band */}
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>{data.title}</Text>
          <Text style={styles.headerSubtitle}>Schéma corporel</Text>
          <View style={styles.headerMeta}>
            <View style={styles.headerMetaCol}>
              <Text style={styles.headerMetaLabel}>CONSULTANT</Text>
              <Text style={styles.headerMetaValue}>{data.consultantName}</Text>
            </View>
            <View style={styles.headerMetaCol}>
              <Text style={styles.headerMetaLabel}>PRATICIEN</Text>
              <Text style={styles.headerMetaValue}>{data.practitionerName}</Text>
            </View>
            <View style={styles.headerMetaCol}>
              <Text style={styles.headerMetaLabel}>DATE</Text>
              <Text style={styles.headerMetaValue}>{formatDate(data.date)}</Text>
            </View>
          </View>
        </View>

        {/* Drawing Snapshot */}
        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
          <Image
            src={data.snapshotBase64}
            style={{ maxWidth: 500, maxHeight: 600, objectFit: 'contain' }}
          />
        </View>

        {/* Notes */}
        {data.notes ? (
          <View style={styles.welcomeBox}>
            <Text style={{ ...styles.fieldLabel, marginBottom: 4 }}>NOTES</Text>
            <Text style={styles.fieldValue}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.practitionerName} — Schéma corporel
          </Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
