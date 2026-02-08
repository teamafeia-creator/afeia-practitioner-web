import { buildInvoiceEmailText } from '@/lib/invoicing/email-templates';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

const mockInvoice: ConsultationInvoice = {
  id: 'test-id',
  practitioner_id: 'pract-id',
  consultant_id: 'consult-id',
  consultation_id: 'consultation-id',
  numero: '2026-0001',
  date_emission: '2026-02-07T10:00:00Z',
  annee_fiscale: 2026,
  template_id: null,
  description: 'Consultation de naturopathie',
  montant: 80,
  tva_applicable: false,
  taux_tva: null,
  montant_ttc: null,
  status: 'paid',
  payment_method: 'especes',
  payment_date: '2026-02-07T10:00:00Z',
  payment_notes: null,
  practitioner_snapshot: {
    nom: 'Dupont',
    prenom: 'Marie',
    adresse: '123 Rue de la Paix, 75001 Paris',
    siret: '12345678901234',
    mention_tva: 'TVA non applicable, art. 293 B du CGI',
    statut_juridique: 'Micro-entrepreneur',
  },
  consultant_snapshot: {
    nom: 'Martin',
    prenom: 'Jean',
    email: 'jean.martin@test.com',
  },
  is_avoir: false,
  facture_origine_id: null,
  motif_remboursement: null,
  stripe_payment_link_url: null,
  stripe_payment_link_expires_at: null,
  stripe_payment_intent_id: null,
  created_at: '2026-02-07T10:00:00Z',
  updated_at: '2026-02-07T10:00:00Z',
};

describe('buildInvoiceEmailText', () => {
  it('should generate subject, text and html', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.subject).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.html).toBeDefined();
  });

  it('should include consultant first name in text', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.text).toContain('Jean');
  });

  it('should include practitioner name in text', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.text).toContain('Marie');
    expect(result.text).toContain('Dupont');
  });

  it('should include date in subject', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.subject).toContain('2026');
  });

  it('should use facture label by default', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.subject.toLowerCase()).toContain('facture');
  });

  it('should use recu label when specified', () => {
    const result = buildInvoiceEmailText(mockInvoice, 'recu');
    expect(result.subject.toLowerCase()).toContain('recu');
  });

  it('should include mutuelle mention', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.text).toContain('mutuelle');
  });

  it('should generate valid HTML', () => {
    const result = buildInvoiceEmailText(mockInvoice);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('</div>');
  });
});
