/**
 * Calendar utility functions for generating .ics files
 */

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
}

/**
 * Format date according to RFC 5545 (iCalendar format)
 */
function formatDateForICS(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in iCalendar text
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate .ics file content for an event
 */
export function generateICSContent(event: CalendarEvent): string {
  const startDate = formatDateForICS(event.startDate);
  const endDate = formatDateForICS(event.endDate);
  const now = formatDateForICS(new Date());
  
  // Build location string
  const locationParts: string[] = [];
  if (event.venueName) locationParts.push(event.venueName);
  if (event.venueAddress) locationParts.push(event.venueAddress);
  if (event.city) locationParts.push(event.city);
  const location = locationParts.length > 0 ? locationParts.join(', ') : event.location || '';

  // Build description
  const description = event.description ? escapeICS(event.description) : '';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Getiickets//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substring(7)}@getiickets.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICS(event.title)}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${escapeICS(location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((line) => line !== '')
    .join('\r\n');

  return icsContent;
}

/**
 * Download .ics file for an event
 */
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
