import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm', { locale: fr });
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: fr });
}

export function formatDayMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: fr });
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
