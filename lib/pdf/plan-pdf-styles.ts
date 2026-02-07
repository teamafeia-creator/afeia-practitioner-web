import { StyleSheet } from '@react-pdf/renderer';

/**
 * Charte graphique AFEIA pour le PDF du conseillancier.
 *
 * Palette :
 * - Teal #1A6C6C (principal)
 * - Aubergine #85004F (accent)
 * - Sable #F5EFE7 (fond)
 * - Charcoal #3D3D3D (texte)
 * - Gold #FF9A3D (alerte)
 * - Sage #89A889 (secondaire)
 * - Warmgray #8C8680
 */

export const COLORS = {
  teal: '#1A6C6C',
  tealLight: '#E8F4F4',
  aubergine: '#85004F',
  sable: '#F5EFE7',
  charcoal: '#3D3D3D',
  gold: '#FF9A3D',
  sage: '#89A889',
  warmgray: '#8C8680',
  white: '#FFFFFF',
  border: '#D4CDC6',
  sectionBg: '#F9F6F2',
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.charcoal,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },

  // ─── Header (première page) ──────────────────
  headerBand: {
    backgroundColor: COLORS.teal,
    marginHorizontal: -40,
    marginTop: -50,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 25,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: COLORS.white,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  headerMetaCol: {
    flex: 1,
  },
  headerMetaLabel: {
    fontSize: 8,
    color: COLORS.white,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerMetaValue: {
    fontSize: 11,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
  },
  versionBadge: {
    backgroundColor: COLORS.aubergine,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  versionBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },

  // ─── Message d'accueil ────────────────────────
  welcomeBox: {
    backgroundColor: COLORS.sable,
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.teal,
  },
  welcomeText: {
    fontSize: 10.5,
    color: COLORS.charcoal,
    lineHeight: 1.6,
    fontStyle: 'italic',
  },

  // ─── Sections ────────────────────────────────
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.teal,
    paddingBottom: 6,
  },
  sectionIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Champs ──────────────────────────────────
  fieldContainer: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 8.5,
    color: COLORS.warmgray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
    fontFamily: 'Helvetica-Bold',
  },
  fieldValue: {
    fontSize: 10,
    color: COLORS.charcoal,
    lineHeight: 1.6,
  },
  fieldBox: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
  },

  // ─── Informations programme ──────────────────
  programInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  programInfoItem: {
    flex: 1,
    backgroundColor: COLORS.tealLight,
    borderRadius: 4,
    padding: 10,
  },
  programInfoLabel: {
    fontSize: 8,
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  programInfoValue: {
    fontSize: 10,
    color: COLORS.charcoal,
  },

  // ─── Pied de page ────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.warmgray,
  },
  footerPage: {
    fontSize: 8,
    color: COLORS.warmgray,
  },

  // ─── Message de clôture ──────────────────────
  closingBox: {
    backgroundColor: COLORS.sable,
    borderRadius: 6,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.sage,
  },
  closingText: {
    fontSize: 10.5,
    color: COLORS.charcoal,
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
});
