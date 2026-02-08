/**
 * Utility functions for email template variable replacement
 */

export interface TemplateVariables {
  prenom: string;
  nom: string;
  date: string;
  heure: string;
  type: string;
  duree: string;
  praticien: string;
  adresse: string;
  lien_visio?: string;
  delai_annulation?: string;
}

/**
 * Replace template variables in a string
 */
export function replaceTemplateVariables(template: string, data: TemplateVariables): string {
  return template
    .replace(/\{prenom\}/g, data.prenom)
    .replace(/\{nom\}/g, data.nom)
    .replace(/\{date\}/g, data.date)
    .replace(/\{heure\}/g, data.heure)
    .replace(/\{type\}/g, data.type)
    .replace(/\{duree\}/g, data.duree)
    .replace(/\{praticien\}/g, data.praticien)
    .replace(/\{adresse\}/g, data.adresse)
    .replace(/\{lien_visio\}/g, data.lien_visio || '')
    .replace(/\{delai_annulation\}/g, data.delai_annulation || '24');
}

/**
 * Format a date in French locale
 */
export function formatDateFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format time as "14h00"
 */
export function formatTimeFR(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
