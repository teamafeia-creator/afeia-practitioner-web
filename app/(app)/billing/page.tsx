// app/(app)/billing/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { SubscriptionCard } from '@/components/billing/subscription-card';
import { BillingHistoryTable } from '@/components/billing/billing-history-table';
import { InvoiceList } from '@/components/billing/invoice-list';
import { PaymentMethodCard } from '@/components/billing/payment-method-card';
import { BillingSkeleton } from '@/components/billing/billing-skeleton';
import { getBillingData, getAvailablePlans } from '@/lib/billing/api';
import type { Subscription, Invoice, BillingHistoryEvent, SubscriptionPlan, PaymentMethod } from '@/lib/billing/types';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [history, setHistory] = useState<BillingHistoryEvent[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const loadBillingData = useCallback(async () => {
    try {
      const [billingData, availablePlans] = await Promise.all([
        getBillingData(),
        getAvailablePlans(),
      ]);

      setSubscription(billingData.subscription);
      setInvoices(billingData.invoices);
      setHistory(billingData.history);
      setPaymentMethods(billingData.paymentMethods);
      setPlans(availablePlans);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const handleSubscriptionUpdate = () => {
    setLoading(true);
    loadBillingData();
  };

  if (loading) {
    return <BillingSkeleton />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Abonnement et facturation"
        subtitle="Gérez votre abonnement et consultez vos factures"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Colonne principale */}
        <div className="space-y-6 min-w-0">
          <SubscriptionCard
            subscription={subscription}
            plans={plans}
            onSubscriptionUpdate={handleSubscriptionUpdate}
          />
          <InvoiceList invoices={invoices} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">
          <BillingHistoryTable events={history} />
          <PaymentMethodCard paymentMethods={paymentMethods} />
        </div>
      </div>
    </PageShell>
  );
}
