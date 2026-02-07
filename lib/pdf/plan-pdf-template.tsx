import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS } from './plan-pdf-styles';
import {
  CONSEILLANCIER_SECTIONS,
  migrateOldPlanContent,
  sectionHasContent,
  type ConseillancierContent,
  type ConseillancierSection,
} from '../conseillancier';

// ─── Types ─────────────────────────────────────────

export type PlanPdfData = {
  consultantName: string;
  practitionerName: string;
  date: string;
  version: number;
  status: 'draft' | 'shared';
  content: Record<string, string> | null;
};

// ─── Helpers ───────────────────────────────────────

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

// ─── Components ────────────────────────────────────

function Header({ data }: { data: PlanPdfData }) {
  return (
    <View style={styles.headerBand} fixed>
      <Text style={styles.headerTitle}>CONSEILLANCIER</Text>
      <Text style={styles.headerSubtitle}>
        Programme d&apos;Hygi&egrave;ne Vitale
      </Text>
      <View style={styles.headerMeta}>
        <View style={styles.headerMetaCol}>
          <Text style={styles.headerMetaLabel}>Consultant</Text>
          <Text style={styles.headerMetaValue}>{data.consultantName}</Text>
        </View>
        <View style={styles.headerMetaCol}>
          <Text style={styles.headerMetaLabel}>Naturopathe</Text>
          <Text style={styles.headerMetaValue}>{data.practitionerName}</Text>
        </View>
        <View style={styles.headerMetaCol}>
          <Text style={styles.headerMetaLabel}>Date</Text>
          <Text style={styles.headerMetaValue}>{formatDate(data.date)}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>
              v{data.version} — {data.status === 'shared' ? 'Partagé' : 'Brouillon'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WelcomeMessage({ content }: { content: ConseillancierContent }) {
  if (!content.message_accueil?.trim()) return null;
  return (
    <View style={styles.welcomeBox}>
      <Text style={styles.welcomeText}>{content.message_accueil}</Text>
    </View>
  );
}

function ProgramInfo({ content }: { content: ConseillancierContent }) {
  const hasDuree = content.duree_programme?.trim();
  const hasDate = content.date_debut_conseille?.trim();
  if (!hasDuree && !hasDate) return null;

  return (
    <View style={styles.programInfo}>
      {hasDuree ? (
        <View style={styles.programInfoItem}>
          <Text style={styles.programInfoLabel}>Durée du programme</Text>
          <Text style={styles.programInfoValue}>{content.duree_programme}</Text>
        </View>
      ) : null}
      {hasDate ? (
        <View style={styles.programInfoItem}>
          <Text style={styles.programInfoLabel}>Début conseillé</Text>
          <Text style={styles.programInfoValue}>
            {content.date_debut_conseille}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SectionBlock({
  section,
  content,
}: {
  section: ConseillancierSection;
  content: ConseillancierContent;
}) {
  // Skip sections with no content
  if (!sectionHasContent(section, content)) return null;

  // Skip en_tete (handled separately) and cloture (handled at end)
  if (section.id === 'en_tete' || section.id === 'cloture') return null;

  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.fields.map((field) => {
        const value = content[field.key]?.trim();
        if (!value) return null;

        // If the section has only one field, skip the label
        const showLabel = section.fields.length > 1;

        return (
          <View key={field.key} style={styles.fieldBox}>
            {showLabel ? (
              <Text style={styles.fieldLabel}>{field.label}</Text>
            ) : null}
            <Text style={styles.fieldValue}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ClosingMessage({ content }: { content: ConseillancierContent }) {
  if (!content.message_cloture?.trim()) return null;
  return (
    <View style={styles.closingBox}>
      <Text style={styles.closingText}>{content.message_cloture}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        AFEIA — Votre accompagnement naturopathique
      </Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Document principal ────────────────────────────

export function PlanPdfDocument({ data }: { data: PlanPdfData }) {
  const content = migrateOldPlanContent(data.content);

  return (
    <Document
      title={`Conseillancier — ${data.consultantName}`}
      author={data.practitionerName}
      subject="Programme d'Hygiène Vitale"
      creator="AFEIA"
    >
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <WelcomeMessage content={content} />
        <ProgramInfo content={content} />

        {CONSEILLANCIER_SECTIONS.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            content={content}
          />
        ))}

        <ClosingMessage content={content} />
        <Footer />
      </Page>
    </Document>
  );
}
