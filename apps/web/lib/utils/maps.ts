/**
 * Maps utility functions for generating map links
 */

interface Location {
  venueName?: string;
  venueAddress?: string;
  city?: string;
  country?: string;
}

/**
 * Generate Google Maps search URL from location details
 */
export function generateGoogleMapsURL(location: Location): string {
  const parts: string[] = [];
  
  if (location.venueName) {
    parts.push(location.venueName);
  }
  
  if (location.venueAddress) {
    parts.push(location.venueAddress);
  }
  
  if (location.city) {
    parts.push(location.city);
  }
  
  if (location.country) {
    parts.push(location.country);
  }
  
  const query = parts.join(', ');
  const encodedQuery = encodeURIComponent(query);
  
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

/**
 * Open Google Maps in a new tab/window
 */
export function openGoogleMaps(location: Location): void {
  const url = generateGoogleMapsURL(location);
  window.open(url, '_blank', 'noopener,noreferrer');
}
