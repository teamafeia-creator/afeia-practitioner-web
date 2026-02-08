import { z } from 'zod';

export const createInvoiceSchema = z.object({
  consultant_id: z.string().uuid(),
  consultation_id: z.string().uuid().nullable(),
  template_id: z.string().nullable(),
  description: z.string().min(3, 'La description est requise'),
  montant: z.number().positive('Le montant doit être positif'),
  payment_method: z
    .enum(['especes', 'cheque', 'cb', 'virement', 'stripe'])
    .nullable(),
  payment_date: z.string().nullable(),
  payment_notes: z.string().nullable(),
  status: z.enum(['draft', 'issued', 'paid']),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  description: z.string().min(3).optional(),
  montant: z.number().positive().optional(),
  status: z.enum(['draft', 'issued', 'paid', 'cancelled']).optional(),
  payment_method: z
    .enum(['especes', 'cheque', 'cb', 'virement', 'stripe'])
    .nullable()
    .optional(),
  payment_date: z.string().nullable().optional(),
  payment_notes: z.string().nullable().optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const billingSettingsSchema = z.object({
  siret: z
    .string()
    .regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  adresse_facturation: z.string().min(10, "L'adresse est requise"),
  mention_tva: z.string().min(5),
  statut_juridique: z.string().default('Micro-entrepreneur'),
  libelle_document: z.enum(['facture', 'recu', 'facture-recu']),
  email_auto_consultant: z.boolean(),
  email_copie_praticien: z.boolean(),
});

export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>;

export const invoiceTemplateSchema = z.object({
  id: z.string().min(3),
  label: z.string().min(3),
  description: z.string().min(5),
  montant_defaut: z.number().positive(),
  duree_defaut: z.number().int().positive().nullable(),
  ordre: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateSchema>;

export const markPaidSchema = z.object({
  payment_method: z.enum(['especes', 'cheque', 'cb', 'virement', 'stripe']),
  payment_date: z.string().nullable().optional(),
  payment_notes: z.string().nullable().optional(),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;

// V2 schemas

export const createAvoirSchema = z.object({
  facture_origine_id: z.string().uuid(),
  motif_remboursement: z.enum([
    'consultation_annulee',
    'erreur_facturation',
    'geste_commercial',
    'autre',
  ]),
  motif_detail: z.string().optional(),
});

export type CreateAvoirInput = z.infer<typeof createAvoirSchema>;

export const reminderSettingsSchema = z.object({
  relances_auto: z.boolean(),
  delai_relance_j7: z.boolean(),
  delai_relance_j15: z.boolean(),
  delai_relance_j30: z.boolean(),
  email_template_relance_j7: z.string().nullable().optional(),
  email_template_relance_j15: z.string().nullable().optional(),
  email_template_relance_j30: z.string().nullable().optional(),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const exportQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).default('month'),
  year: z.coerce.number().optional(),
  month: z.coerce.number().optional(),
});
