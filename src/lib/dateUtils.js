/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents timezone issues where dates appear one day off
 */
export function parseLocalDate(dateString) {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // If it's a date string in YYYY-MM-DD format, parse it as local
  if (typeof dateString === 'string') {
    // Check if it's in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Otherwise, parse normally
    return new Date(dateString);
  }
  
  return null;
}

import { format } from 'date-fns';

/**
 * Format a date for display, handling timezone issues
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  const localDate = parseLocalDate(date);
  if (!localDate || isNaN(localDate.getTime())) return '';
  return format(localDate, formatStr);
}
