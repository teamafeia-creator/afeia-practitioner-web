/**
 * Generate an ICS (iCalendar) file content for an appointment.
 * Follows RFC 5545 specification.
 */
export function generateICS(appointment: {
  starts_at: string;
  ends_at: string;
  title: string;
  description: string;
  location: string;
}): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@afeia.fr`;
  const now = formatICSDate(new Date().toISOString());
  const dtStart = formatICSDate(appointment.starts_at);
  const dtEnd = formatICSDate(appointment.ends_at);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AFEIA//Booking//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(appointment.title)}`,
    `DESCRIPTION:${escapeICSText(appointment.description)}`,
    `LOCATION:${escapeICSText(appointment.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

function formatICSDate(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
