import {
  formatCurrency,
  formatDate,
  formatDateShort,
  getCurrentFiscalYear,
  generateTemplateId,
  getStatusLabel,
  getPaymentMethodLabel,
  calculateInvoiceStats,
} from '@/lib/invoicing/utils';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

describe('formatCurrency', () => {
  it('should format a number as EUR currency', () => {
    const result = formatCurrency(80);
    expect(result).toContain('80');
    expect(result).toContain('€');
  });

  it('should format decimal amounts', () => {
    const result = formatCurrency(80.5);
    expect(result).toContain('80');
    expect(result).toContain('50');
  });

  it('should handle zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });
});

describe('formatDate', () => {
  it('should format an ISO date string in French', () => {
    const result = formatDate('2026-02-07T10:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('07');
  });

  it('should return "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });
});

describe('formatDateShort', () => {
  it('should format a date as JJ/MM/AAAA', () => {
    const result = formatDateShort('2026-02-07T10:00:00Z');
    expect(result).toContain('07');
    expect(result).toContain('02');
    expect(result).toContain('2026');
  });

  it('should return "-" for null', () => {
    expect(formatDateShort(null)).toBe('-');
  });
});

describe('getCurrentFiscalYear', () => {
  it('should return the current year', () => {
    const year = getCurrentFiscalYear();
    expect(year).toBe(new Date().getFullYear());
  });
});

describe('generateTemplateId', () => {
  it('should generate a slug from a label', () => {
    expect(generateTemplateId('Premiere consultation')).toBe('premiere_consultation');
  });

  it('should remove accents', () => {
    expect(generateTemplateId('Atelier thematique')).toBe('atelier_thematique');
  });

  it('should handle special characters', () => {
    expect(generateTemplateId('Test / Special')).toBe('test_special');
  });
});

describe('getStatusLabel', () => {
  it('should return French labels for statuses', () => {
    expect(getStatusLabel('draft')).toBe('Brouillon');
    expect(getStatusLabel('issued')).toBe('En attente');
    expect(getStatusLabel('paid')).toBe('Payee');
    expect(getStatusLabel('cancelled')).toBe('Annulee');
  });
});

describe('getPaymentMethodLabel', () => {
  it('should return French labels for payment methods', () => {
    expect(getPaymentMethodLabel('especes')).toBe('Especes');
    expect(getPaymentMethodLabel('cheque')).toBe('Cheque');
    expect(getPaymentMethodLabel('cb')).toBe('Carte bancaire');
    expect(getPaymentMethodLabel('virement')).toBe('Virement');
    expect(getPaymentMethodLabel('stripe')).toBe('Paiement en ligne');
  });

  it('should return "-" for null', () => {
    expect(getPaymentMethodLabel(null)).toBe('-');
  });
});

describe('calculateInvoiceStats', () => {
  const mockInvoices: Partial<ConsultationInvoice>[] = [
    { montant: 80, status: 'paid' },
    { montant: 60, status: 'paid' },
    { montant: 80, status: 'issued' },
    { montant: 25, status: 'draft' },
    { montant: 60, status: 'cancelled' },
  ];

  it('should calculate total amount', () => {
    const stats = calculateInvoiceStats(mockInvoices as ConsultationInvoice[]);
    expect(stats.total).toBe(305);
  });

  it('should calculate paid amount', () => {
    const stats = calculateInvoiceStats(mockInvoices as ConsultationInvoice[]);
    expect(stats.paid).toBe(140);
  });

  it('should calculate unpaid amount (issued only)', () => {
    const stats = calculateInvoiceStats(mockInvoices as ConsultationInvoice[]);
    expect(stats.unpaid).toBe(80);
  });

  it('should count invoices correctly', () => {
    const stats = calculateInvoiceStats(mockInvoices as ConsultationInvoice[]);
    expect(stats.count).toBe(5);
    expect(stats.paidCount).toBe(2);
    expect(stats.unpaidCount).toBe(1);
  });

  it('should calculate average amount from paid invoices', () => {
    const stats = calculateInvoiceStats(mockInvoices as ConsultationInvoice[]);
    expect(stats.avgAmount).toBe(70);
  });

  it('should handle empty array', () => {
    const stats = calculateInvoiceStats([]);
    expect(stats.total).toBe(0);
    expect(stats.paid).toBe(0);
    expect(stats.unpaid).toBe(0);
    expect(stats.count).toBe(0);
    expect(stats.avgAmount).toBe(0);
  });
});
