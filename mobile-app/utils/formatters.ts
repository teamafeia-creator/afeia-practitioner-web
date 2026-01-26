// Fonctions de formatage pour AFEIA Patient

// Formater une date en format français
export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  };

  return dateObj.toLocaleDateString('fr-FR', defaultOptions);
};

// Formater une date courte (ex: 15 jan.)
export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
  });
};

// Formater une heure
export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Heure invalide';
  }

  return dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Formater date et heure
export const formatDateTime = (date: string | Date): string => {
  return `${formatDate(date)} à ${formatTime(date)}`;
};

// Temps relatif (il y a X minutes/heures/jours)
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;

  return formatDateShort(date);
};

// Formater un nom complet
export const formatFullName = (firstName?: string, lastName?: string): string => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Utilisateur';
};

// Formater les initiales
export const formatInitials = (firstName?: string, lastName?: string): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return firstInitial + lastInitial || '?';
};

// Formater un numéro de téléphone
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  // Format français
  if (cleaned.startsWith('33')) {
    const number = cleaned.slice(2);
    return `+33 ${number.slice(0, 1)} ${number.slice(1, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7, 9)}`;
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }

  return phone;
};

// Formater un pourcentage
export const formatPercent = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// Formater une durée en minutes
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
};

// Tronquer un texte
export const truncateText = (text: string, maxLength: number, ellipsis: string = '...'): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};

// Capitaliser la première lettre
export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Formater un score (1-5) en emoji
export const formatMoodEmoji = (score: number): string => {
  const emojis = ['😔', '😕', '😐', '🙂', '😊'];
  const index = Math.max(0, Math.min(4, Math.round(score) - 1));
  return emojis[index];
};

// Formater des étoiles (1-5)
export const formatStars = (score: number, maxStars: number = 5): string => {
  const filled = Math.min(maxStars, Math.max(0, Math.round(score)));
  const empty = maxStars - filled;
  return '★'.repeat(filled) + '☆'.repeat(empty);
};

export default {
  formatDate,
  formatDateShort,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatFullName,
  formatInitials,
  formatPhoneNumber,
  formatPercent,
  formatDuration,
  truncateText,
  capitalize,
  formatMoodEmoji,
  formatStars,
};
