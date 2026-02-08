'use client';

import {
  BookOpen,
  MessageSquare,
  ClipboardList,
  Smartphone,
  Radio,
  Clock,
  FileText,
} from 'lucide-react';

type Engagement = {
  last_activity: string | null;
  journal_entries_count: number;
  journal_frequency: number;
  last_journal_entry: string | null;
  messages_count: number;
  last_message: string | null;
  questionnaires_count: number;
  last_questionnaire: string | null;
  plans_count: number;
};

type PatientEngagementSectionProps = {
  engagement: Engagement;
  circularEnabled: boolean;
  lastCircularSyncAt: string | null;
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "A l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 30) return `il y a ${diffDays}j`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `il y a ${diffMonths} mois`;
  return `il y a ${Math.floor(diffDays / 365)} an(s)`;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type EngagementRowProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
};

function EngagementRow({ icon: Icon, label, value, detail }: EngagementRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-medium text-slate-800">{value}</div>
        {detail && <div className="text-xs text-slate-400">{detail}</div>}
      </div>
    </div>
  );
}

export function PatientEngagementSection({
  engagement,
  circularEnabled,
  lastCircularSyncAt,
}: PatientEngagementSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-800 mb-3">
        Indicateurs d&apos;engagement
      </h3>
      <div className="divide-y divide-slate-100">
        <EngagementRow
          icon={Clock}
          label="Derniere activite"
          value={formatRelativeTime(engagement.last_activity)}
          detail={formatDateTime(engagement.last_activity)}
        />
        <EngagementRow
          icon={Smartphone}
          label="App mobile"
          value="—"
          detail="Non disponible"
        />
        <EngagementRow
          icon={Radio}
          label="Circular"
          value={circularEnabled ? 'Connecte' : 'Non connecte'}
          detail={circularEnabled && lastCircularSyncAt
            ? `Derniere sync ${formatRelativeTime(lastCircularSyncAt)}`
            : undefined}
        />
        <EngagementRow
          icon={BookOpen}
          label="Journal"
          value={engagement.journal_entries_count > 0
            ? `${engagement.journal_entries_count} entrees`
            : '—'}
          detail={engagement.journal_entries_count > 0
            ? `${engagement.journal_frequency} entrees/sem. — dernier ${formatRelativeTime(engagement.last_journal_entry)}`
            : undefined}
        />
        <EngagementRow
          icon={ClipboardList}
          label="Questionnaires"
          value={engagement.questionnaires_count > 0
            ? `${engagement.questionnaires_count} recu(s)`
            : '—'}
          detail={engagement.last_questionnaire
            ? `Dernier ${formatRelativeTime(engagement.last_questionnaire)}`
            : undefined}
        />
        <EngagementRow
          icon={MessageSquare}
          label="Messages"
          value={engagement.messages_count > 0
            ? `${engagement.messages_count} echanges`
            : '—'}
          detail={engagement.last_message
            ? `Dernier ${formatRelativeTime(engagement.last_message)}`
            : undefined}
        />
        <EngagementRow
          icon={FileText}
          label="Conseillanciers"
          value={engagement.plans_count > 0
            ? `${engagement.plans_count} actif(s)`
            : '—'}
        />
      </div>
    </div>
  );
}
