'use client';

import { Badge } from '../ui/Badge';
import type { InvoiceStatus } from '@/lib/invoicing/types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'archived' | 'pending' | 'success' | 'attention' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'archived' },
  issued: { label: 'En attente', variant: 'pending' },
  paid: { label: 'Payée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'attention' },
  refunded: { label: 'Remboursée', variant: 'info' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
