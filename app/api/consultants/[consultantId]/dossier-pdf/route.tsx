import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { ANAMNESIS_SECTIONS } from '@/lib/anamnesis';

// ─── PDF Styles (matching existing AFEIA style) ─────────
const COLORS = {
  teal: '#1A6C6C',
  tealLight: '#E8F4F4',
  charcoal: '#3D3D3D',
  sable: '#F5EFE7',
  warmgray: '#8C8680',
  white: '#FFFFFF',
  border: '#D4CDC6',
  sectionBg: '#F9F6F2',
  aubergine: '#85004F',
  sage: '#89A889',
  gold: '#FF9A3D',
  red: '#DC2626',
};

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: COLORS.charcoal, paddingTop: 50, paddingBottom: 60, paddingHorizontal: 40, backgroundColor: COLORS.white },
  headerBand: { backgroundColor: COLORS.teal, marginHorizontal: -40, marginTop: -50, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 25, marginBottom: 20 },
  headerTitle: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: COLORS.white, letterSpacing: 1 },
  headerSub: { fontSize: 11, color: COLORS.white, opacity: 0.85, marginTop: 4 },
  headerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  headerMetaCol: { flex: 1 },
  headerMetaLabel: { fontSize: 8, color: COLORS.white, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  headerMetaValue: { fontSize: 11, color: COLORS.white, fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.teal, paddingBottom: 6 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: COLORS.teal, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', marginBottom: 4 },
  fieldLabel: { fontSize: 8.5, color: COLORS.warmgray, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Helvetica-Bold', width: 140, marginRight: 8 },
  fieldValue: { fontSize: 10, color: COLORS.charcoal, flex: 1 },
  fieldBox: { backgroundColor: COLORS.sectionBg, borderRadius: 4, padding: 10, marginBottom: 6 },
  badge: { fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 4 },
  badgeTeal: { backgroundColor: COLORS.tealLight, color: COLORS.teal },
  badgeRed: { backgroundColor: '#FEE2E2', color: COLORS.red },
  badgeGold: { backgroundColor: '#FFF7ED', color: '#C2410C' },
  badgeGreen: { backgroundColor: '#DCFCE7', color: '#166534' },
  listItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 8 },
  bullet: { fontSize: 10, marginRight: 6, color: COLORS.teal },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  footerText: { fontSize: 8, color: COLORS.warmgray },
  noteBox: { backgroundColor: COLORS.sable, borderRadius: 4, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: COLORS.teal },
  noteText: { fontSize: 10, color: COLORS.charcoal, lineHeight: 1.5 },
});

function formatFrenchDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type DossierPdfData = {
  consultant: Record<string, string | number | boolean | null | undefined>;
  practitionerName: string;
  medicalHistory: { id: string; category: string; description: string; year_onset?: number | null; is_active: boolean }[];
  allergies: { id: string; type: string; substance: string; severity?: string | null; diagnosed?: boolean }[];
  treatments: { id: string; name: string; dosage?: string | null; prescriber?: string | null; is_active: boolean }[];
  relationships: { id: string; relationship_type: string; label?: string | null; related_consultant?: { name?: string } }[];
  anamnesis: { answers?: Record<string, unknown> } | null;
  notes: { id: string; content?: string | null; updated_at: string }[];
};

function DossierPdfDocument({ data }: { data: DossierPdfData }) {
  const { consultant, practitionerName, medicalHistory, allergies, treatments, relationships, anamnesis, notes } = data;
  const consultantName = (consultant.name as string) || 'Consultant';
  const today = formatFrenchDate(new Date().toISOString());

  const genderLabels: Record<string, string> = { male: 'Homme', female: 'Femme', other: 'Autre' };
  const catLabels: Record<string, string> = { personal: 'Personnel', family: 'Familial', surgical: 'Chirurgical' };
  const typeLabels: Record<string, string> = { allergy: 'Allergie', intolerance: 'Intolérance', sensitivity: 'Sensibilité' };
  const sevLabels: Record<string, string> = { mild: 'Légère', moderate: 'Modérée', severe: 'Sévère' };
  const relLabels: Record<string, string> = { parent: 'Parent', child: 'Enfant', spouse: 'Conjoint(e)', sibling: 'Frère/Sœur', other: 'Autre' };

  return (
    <Document title={`Dossier Consultant — ${consultantName}`} author={practitionerName} subject="Dossier Consultant" creator="AFEIA">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBand} fixed>
          <Text style={s.headerTitle}>DOSSIER CONSULTANT</Text>
          <Text style={s.headerSub}>{consultantName}</Text>
          <View style={s.headerMeta}>
            <View style={s.headerMetaCol}>
              <Text style={s.headerMetaLabel}>Naturopathe</Text>
              <Text style={s.headerMetaValue}>{practitionerName}</Text>
            </View>
            <View style={s.headerMetaCol}>
              <Text style={s.headerMetaLabel}>Date</Text>
              <Text style={s.headerMetaValue}>{today}</Text>
            </View>
          </View>
        </View>

        {/* Personal info */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Informations personnelles</Text>
          </View>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Nom</Text>
            <Text style={s.fieldValue}>{consultantName}</Text>
          </View>
          {consultant.email ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Email</Text><Text style={s.fieldValue}>{String(consultant.email)}</Text></View> : null}
          {consultant.phone ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Téléphone</Text><Text style={s.fieldValue}>{String(consultant.phone)}</Text></View> : null}
          {consultant.date_of_birth ? (
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Date de naissance</Text>
              <Text style={s.fieldValue}>{formatFrenchDate(String(consultant.date_of_birth))} ({Math.floor((Date.now() - new Date(String(consultant.date_of_birth)).getTime()) / 31557600000)} ans)</Text>
            </View>
          ) : consultant.age ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Âge</Text><Text style={s.fieldValue}>{String(consultant.age)} ans</Text></View> : null}
          {consultant.gender ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Sexe</Text><Text style={s.fieldValue}>{genderLabels[String(consultant.gender)] || String(consultant.gender)}</Text></View> : null}
          {consultant.address_line1 ? (
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Adresse</Text>
              <Text style={s.fieldValue}>{[consultant.address_line1, consultant.address_line2, consultant.postal_code, consultant.city].filter(Boolean).map(String).join(', ')}</Text>
            </View>
          ) : consultant.city ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Ville</Text><Text style={s.fieldValue}>{String(consultant.city)}</Text></View> : null}
          {consultant.profession ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Profession</Text><Text style={s.fieldValue}>{String(consultant.profession)}</Text></View> : null}
          {consultant.consultation_reason ? <View style={s.fieldRow}><Text style={s.fieldLabel}>Motif</Text><Text style={s.fieldValue}>{String(consultant.consultation_reason)}</Text></View> : null}
        </View>

        {/* Medical contacts */}
        {(consultant.referring_doctor_name || consultant.emergency_contact_name) ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Contacts médicaux et urgence</Text>
            </View>
            {consultant.referring_doctor_name ? (
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Médecin traitant</Text>
                <Text style={s.fieldValue}>{String(consultant.referring_doctor_name)}{consultant.referring_doctor_phone ? ` — ${String(consultant.referring_doctor_phone)}` : ''}</Text>
              </View>
            ) : null}
            {consultant.emergency_contact_name ? (
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Contact urgence</Text>
                <Text style={s.fieldValue}>{String(consultant.emergency_contact_name)}{consultant.emergency_contact_phone ? ` — ${String(consultant.emergency_contact_phone)}` : ''}{consultant.emergency_contact_relation ? ` (${String(consultant.emergency_contact_relation)})` : ''}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Relationships */}
        {relationships && relationships.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Liens familiaux</Text>
            </View>
            {relationships.map((rel) => (
              <View key={rel.id} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.fieldValue}>{rel.related_consultant?.name || 'Consultant'} — {relLabels[rel.relationship_type] || rel.relationship_type}{rel.label ? ` (${rel.label})` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Medical History */}
        {medicalHistory && medicalHistory.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Antécédents</Text>
            </View>
            {medicalHistory.map((entry) => (
              <View key={entry.id} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.fieldValue}>
                  [{catLabels[entry.category] || entry.category}] {entry.description}{entry.year_onset ? ` (${entry.year_onset})` : ''} — {entry.is_active ? 'Actif' : 'Résolu'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Allergies */}
        {allergies && allergies.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Allergies et intolérances</Text>
            </View>
            {allergies.map((entry) => (
              <View key={entry.id} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.fieldValue}>
                  [{typeLabels[entry.type] || entry.type}] {entry.substance}{entry.severity ? ` — ${sevLabels[entry.severity] || entry.severity}` : ''}{entry.diagnosed ? ' (Diagnostiquée)' : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Treatments */}
        {treatments && treatments.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Traitements en cours</Text>
            </View>
            {treatments.map((entry) => (
              <View key={entry.id} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.fieldValue}>
                  {entry.name}{entry.dosage ? ` — ${entry.dosage}` : ''}{entry.prescriber ? ` (prescrit par ${entry.prescriber})` : ''} — {entry.is_active ? 'En cours' : 'Arrêté'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Anamnesis summary */}
        {anamnesis?.answers && Object.keys(anamnesis.answers).length > 0 ? (
          <View style={s.section} wrap={false}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Anamnèse (résumé)</Text>
            </View>
            {(() => {
              const answers = anamnesis.answers as Record<string, unknown>;
              // Flatten nested answers
              const flat: Record<string, string> = {};
              for (const [key, val] of Object.entries(answers)) {
                if (typeof val === 'string') {
                  flat[key] = val;
                } else if (typeof val === 'object' && val !== null) {
                  for (const [subKey, subVal] of Object.entries(val as Record<string, string>)) {
                    if (typeof subVal === 'string' && subVal.trim()) flat[subKey] = subVal;
                  }
                }
              }
              // Match with ANAMNESIS_SECTIONS labels
              const rendered: React.ReactElement[] = [];
              for (const section of ANAMNESIS_SECTIONS) {
                for (const q of section.questions) {
                  const answer = flat[q.key];
                  if (answer && answer.trim()) {
                    rendered.push(
                      <View key={q.key} style={s.fieldRow}>
                        <Text style={s.fieldLabel}>{q.label}</Text>
                        <Text style={s.fieldValue}>{answer}</Text>
                      </View>
                    );
                  }
                }
              }
              return rendered.length > 0 ? rendered : <Text style={s.fieldValue}>Aucune donnée d&apos;anamnèse.</Text>;
            })()}
          </View>
        ) : null}

        {/* Last 5 session notes */}
        {notes && notes.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Dernières notes de séance</Text>
            </View>
            {notes.slice(0, 5).map((note) => (
              <View key={note.id} style={s.noteBox}>
                <Text style={{ fontSize: 8, color: COLORS.warmgray, marginBottom: 3 }}>{formatFrenchDate(note.updated_at)}</Text>
                <Text style={s.noteText}>{note.content || '(vide)'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Document généré par AFEIA le {today}. Confidentiel.</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/**
 * GET /api/consultants/[consultantId]/dossier-pdf
 *
 * Generates and returns a complete consultant dossier PDF.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

    // 1. Verify auth
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // 2. Fetch consultant and verify ownership
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('*')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Fetch all data in parallel
    const [
      practitionerResult,
      medicalHistoryResult,
      allergiesResult,
      treatmentsResult,
      relationshipsResult,
      anamnesisResult,
      notesResult,
    ] = await Promise.all([
      supabase.from('practitioners').select('full_name').eq('id', practitionerId).single(),
      supabase.from('medical_history').select('*').eq('consultant_id', consultantId).order('created_at', { ascending: false }),
      supabase.from('allergies').select('*').eq('consultant_id', consultantId).order('created_at', { ascending: false }),
      supabase.from('current_treatments').select('*').eq('consultant_id', consultantId).order('created_at', { ascending: false }),
      supabase.from('consultant_relationships').select('*, related_consultant:consultants!consultant_relationships_related_consultant_id_fkey(id, name)').eq('consultant_id', consultantId),
      supabase.from('consultant_anamnesis').select('*').eq('consultant_id', consultantId).maybeSingle(),
      supabase.from('practitioner_notes').select('*').eq('consultant_id', consultantId).order('updated_at', { ascending: false }).limit(5),
    ]);

    // 4. Build PDF data
    const pdfData = {
      consultant,
      practitionerName: practitionerResult.data?.full_name || 'Naturopathe',
      medicalHistory: medicalHistoryResult.data || [],
      allergies: allergiesResult.data || [],
      treatments: treatmentsResult.data || [],
      relationships: relationshipsResult.data || [],
      anamnesis: anamnesisResult.data || null,
      notes: notesResult.data || [],
    };

    // 5. Generate PDF
    const pdfElement = React.createElement(DossierPdfDocument, { data: pdfData });
    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0]);

    // 6. Return PDF
    const safeName = (consultant.name || 'consultant')
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçæœ\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const filename = `dossier-${safeName}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Exception dossier PDF generation:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF.' },
      { status: 500 }
    );
  }
}
