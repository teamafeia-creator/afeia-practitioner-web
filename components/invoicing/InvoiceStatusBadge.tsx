'use client';

import { Badge } from '../ui/Badge';
import type { InvoiceStatus } from '@/lib/invoicing/types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'archived' | 'pending' | 'success' | 'attention' }> = {
  draft: { label: 'Brouillon', variant: 'archived' },
  issued: { label: 'En attente', variant: 'pending' },
  paid: { label: 'Payee', variant: 'success' },
  cancelled: { label: 'Annulee', variant: 'attention' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
