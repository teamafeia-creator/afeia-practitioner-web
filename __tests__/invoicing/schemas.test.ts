import {
  createInvoiceSchema,
  updateInvoiceSchema,
  billingSettingsSchema,
  invoiceTemplateSchema,
  markPaidSchema,
} from '@/lib/invoicing/schemas';

describe('createInvoiceSchema', () => {
  const validInput = {
    consultant_id: '550e8400-e29b-41d4-a716-446655440000',
    consultation_id: null,
    template_id: null,
    description: 'Consultation de naturopathie',
    montant: 80,
    payment_method: null,
    payment_date: null,
    payment_notes: null,
    status: 'paid' as const,
  };

  it('should validate a correct input', () => {
    const result = createInvoiceSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject a negative amount', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInput,
      montant: -10,
    });
    expect(result.success).toBe(false);
  });

  it('should reject a short description', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInput,
      description: 'AB',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInput,
      status: 'cancelled',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid payment methods', () => {
    const methods = ['especes', 'cheque', 'cb', 'virement', 'stripe'] as const;
    for (const method of methods) {
      const result = createInvoiceSchema.safeParse({
        ...validInput,
        payment_method: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject an invalid payment method', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInput,
      payment_method: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid consultant_id', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInput,
      consultant_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateInvoiceSchema', () => {
  it('should accept partial updates', () => {
    const result = updateInvoiceSchema.safeParse({
      description: 'Updated description',
    });
    expect(result.success).toBe(true);
  });

  it('should accept status change to cancelled', () => {
    const result = updateInvoiceSchema.safeParse({
      status: 'cancelled',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty object as valid (all optional)', () => {
    const result = updateInvoiceSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('billingSettingsSchema', () => {
  const validSettings = {
    siret: '12345678901234',
    adresse_facturation: '123 Rue de la Paix, 75001 Paris',
    mention_tva: 'TVA non applicable, art. 293 B du CGI',
    statut_juridique: 'Micro-entrepreneur',
    libelle_document: 'facture' as const,
    email_auto_consultant: true,
    email_copie_praticien: false,
  };

  it('should validate correct settings', () => {
    const result = billingSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('should reject a SIRET with wrong length', () => {
    const result = billingSettingsSchema.safeParse({
      ...validSettings,
      siret: '123456',
    });
    expect(result.success).toBe(false);
  });

  it('should reject a SIRET with letters', () => {
    const result = billingSettingsSchema.safeParse({
      ...validSettings,
      siret: '1234567890ABCD',
    });
    expect(result.success).toBe(false);
  });

  it('should reject a short address', () => {
    const result = billingSettingsSchema.safeParse({
      ...validSettings,
      adresse_facturation: 'Rue',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid document types', () => {
    for (const type of ['facture', 'recu', 'facture-recu']) {
      const result = billingSettingsSchema.safeParse({
        ...validSettings,
        libelle_document: type,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('invoiceTemplateSchema', () => {
  it('should validate a correct template', () => {
    const result = invoiceTemplateSchema.safeParse({
      id: 'consult_premiere',
      label: 'Premiere consultation',
      description: 'Bilan de vitalite',
      montant_defaut: 80,
      duree_defaut: 90,
      ordre: 1,
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject a negative amount', () => {
    const result = invoiceTemplateSchema.safeParse({
      id: 'test',
      label: 'Test',
      description: 'Test description',
      montant_defaut: -10,
      duree_defaut: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('markPaidSchema', () => {
  it('should validate a correct mark-paid input', () => {
    const result = markPaidSchema.safeParse({
      payment_method: 'especes',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional fields', () => {
    const result = markPaidSchema.safeParse({
      payment_method: 'cheque',
      payment_date: '2026-02-07T10:00:00Z',
      payment_notes: 'Cheque n 1234567',
    });
    expect(result.success).toBe(true);
  });

  it('should require payment_method', () => {
    const result = markPaidSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
