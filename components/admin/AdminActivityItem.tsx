'use client';

import {
  LogIn,
  UserPlus,
  FileText,
  Send,
  Radio,
  Activity,
} from 'lucide-react';

type AdminActivityItemProps = {
  eventType: string;
  description: string;
  createdAt: string;
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  'login': LogIn,
  'consultant.create': UserPlus,
  'conseillancier.create': FileText,
  'questionnaire.send': Send,
  'circular.activate': Radio,
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function AdminActivityItem({ eventType, description, createdAt }: AdminActivityItemProps) {
  const Icon = EVENT_ICONS[eventType] ?? Activity;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{description}</p>
      </div>
      <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(createdAt)}</span>
    </div>
  );
}
