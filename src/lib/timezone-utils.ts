/**
 * Timezone utility functions for handling date conversions
 * Fixes UTC timezone issues in journey dates and tour package queries
 */

import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Default timezone - can be configured or detected from user's browser
const DEFAULT_TIMEZONE = 'Asia/Kolkata'; // IST timezone for India

/**
 * Get the user's timezone from browser or default to IST
 */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Could not detect user timezone, using default:', DEFAULT_TIMEZONE);
      return DEFAULT_TIMEZONE;
    }
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Convert a date string/Date to UTC for database storage
 * Handles timezone offset to prevent date shifting
 */
export function dateToUtc(date: string | Date | null | undefined, timezone?: string): Date | undefined {
  if (!date) return undefined;
  
  const tz = timezone || getUserTimezone();
  
  try {
    // If it's already a Date object, ensure it's treated as local date
    if (date instanceof Date) {
      // Get the date components in local timezone
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create a new date at start of day in the specified timezone
      const localDate = new Date(year, month, day);
      return zonedTimeToUtc(startOfDay(localDate), tz);
    }
    
    // If it's a string, parse it and convert
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return zonedTimeToUtc(startOfDay(parsedDate), tz);
  } catch (error) {
    console.error('Error converting date to UTC:', error);
    return undefined;
  }
}

/**
 * Convert a UTC date from database to local timezone for display
 */
export function utcToLocal(utcDate: string | Date | null | undefined, timezone?: string): Date | undefined {
  if (!utcDate) return undefined;
  
  const tz = timezone || getUserTimezone();
  
  try {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return utcToZonedTime(date, tz);
  } catch (error) {
    console.error('Error converting UTC to local:', error);
    return undefined;
  }
}

/**
 * Format a date for display in local timezone
 */
export function formatLocalDate(
  date: string | Date | null | undefined, 
  formatStr: string = 'PPP',
  timezone?: string
): string {
  if (!date) return '';
  
  const tz = timezone || getUserTimezone();
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, tz, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Safe conversion for inquiry journey date to tour package start date
 * Ensures no timezone shift occurs during the conversion
 */
export function convertJourneyDateToTourStart(journeyDate: string | Date | null | undefined): Date | undefined {
  if (!journeyDate) return undefined;
  
  try {
    // Convert to local date first to preserve the intended date
    const localDate = utcToLocal(journeyDate);
    if (!localDate) return undefined;
    
    // Return as start of day in local timezone, then convert to UTC for storage
    return dateToUtc(startOfDay(localDate)) || undefined;
  } catch (error) {
    console.error('Error converting journey date to tour start:', error);
    return undefined;
  }
}

/**
 * Ensure date consistency for API requests
 * Normalizes dates to prevent timezone-related shifts
 */
export function normalizeApiDate(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined;
  
  try {
    const utcDate = dateToUtc(date);
    return utcDate ? utcDate.toISOString() : undefined;
  } catch (error) {
    console.error('Error normalizing API date:', error);
    return undefined;
  }
}

/**
 * Create a date picker value that preserves local date selection
 */
export function createDatePickerValue(dateValue: string | Date | null | undefined): Date | undefined {
  if (!dateValue) return undefined;
  
  try {
    // For date pickers, we want to show the local date without timezone conversion
    if (typeof dateValue === 'string') {
      // If it's an ISO string from database, convert to local
      return utcToLocal(dateValue) || undefined;
    }
    
    // If it's already a Date object, use as-is
    return dateValue instanceof Date ? dateValue : undefined;
  } catch (error) {
    console.error('Error creating date picker value:', error);
    return undefined;
  }
}
