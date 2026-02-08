export type AlertLevel = 'critical' | 'warning' | 'info';

export type AdminAlert = {
  id: string;
  level: AlertLevel;
  type: string;
  title: string;
  description: string;
  practitionerId: string;
  practitionerName: string;
  createdAt: string;
};

type PractitionerForAlerts = {
  id: string;
  full_name: string | null;
  email: string | null;
  last_login_at: string | null;
  created_at: string | null;
  subscription_status: string | null;
  consultants_count: number;
  payment_failed: boolean;
  payment_failed_since: string | null;
};

function daysSince(date: string | null): number {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export function generateAlerts(practitioners: PractitionerForAlerts[]): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  for (const p of practitioners) {
    const name = p.full_name || p.email || 'Inconnu';
    const loginDays = daysSince(p.last_login_at);
    const registeredDays = daysSince(p.created_at);

    // Critical: payment failed > 3 days
    if (p.payment_failed && p.payment_failed_since && daysSince(p.payment_failed_since) > 3) {
      alerts.push({
        id: `payment-${p.id}`,
        level: 'critical',
        type: 'payment_failed',
        title: 'Paiement echoue',
        description: `${name} — echec depuis ${daysSince(p.payment_failed_since)}j`,
        practitionerId: p.id,
        practitionerName: name,
        createdAt: p.payment_failed_since,
      });
    }

    // Critical: inactive > 30 days with active subscription
    if (loginDays > 30 && p.subscription_status === 'active') {
      alerts.push({
        id: `inactive-critical-${p.id}`,
        level: 'critical',
        type: 'inactive_critical',
        title: 'Inactif avec abonnement',
        description: `${name} — derniere connexion il y a ${loginDays}j`,
        practitionerId: p.id,
        practitionerName: name,
        createdAt: p.last_login_at || p.created_at || new Date().toISOString(),
      });
    }

    // Warning: inactive 14-30 days
    if (loginDays >= 14 && loginDays <= 30) {
      alerts.push({
        id: `inactive-warn-${p.id}`,
        level: 'warning',
        type: 'inactive_warning',
        title: 'Inactif',
        description: `${name} — derniere connexion il y a ${loginDays}j`,
        practitionerId: p.id,
        practitionerName: name,
        createdAt: p.last_login_at || p.created_at || new Date().toISOString(),
      });
    }

    // Warning: registered > 7 days with 0 consultants
    if (registeredDays > 7 && p.consultants_count === 0) {
      alerts.push({
        id: `onboarding-${p.id}`,
        level: 'warning',
        type: 'onboarding_stuck',
        title: 'Onboarding bloque',
        description: `${name} — inscrit il y a ${registeredDays}j, 0 consultant`,
        practitionerId: p.id,
        practitionerName: name,
        createdAt: p.created_at || new Date().toISOString(),
      });
    }

    // Info: new practitioner in last 48h
    if (registeredDays <= 2) {
      alerts.push({
        id: `new-${p.id}`,
        level: 'info',
        type: 'new_practitioner',
        title: 'Nouveau praticien',
        description: `${name} — inscrit ${registeredDays === 0 ? "aujourd'hui" : 'hier'}`,
        practitionerId: p.id,
        practitionerName: name,
        createdAt: p.created_at || new Date().toISOString(),
      });
    }
  }

  // Sort: critical first, then warning, then info
  const levelOrder: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return alerts.slice(0, 10);
}
