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
 * For date-only fields, preserves the date components
 */
export function utcToLocal(utcDate: string | Date | null | undefined, timezone?: string): Date | undefined {
  if (!utcDate) return undefined;
  
  try {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    
    console.log('utcToLocal input:', utcDate);
    
    // For date-only fields stored as UTC, extract the date components
    // and create a local date with the same year/month/day
    if (date instanceof Date) {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      
      console.log('UTC date components:', { year, month, day });
      
      // Create local date with same date components
      const result = new Date(year, month, day);
      console.log('utcToLocal result:', result);
      return result;
    }
    
    return undefined;
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
 * For date-only fields, preserves the date regardless of timezone
 */
export function normalizeApiDate(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined;
  
  try {
    // For date-only fields, we want to preserve the date components
    // and store as UTC date with same year/month/day
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (dateObj instanceof Date) {
      // Extract date components from the local date
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      
      console.log('normalizeApiDate input:', dateObj);
      console.log('Extracted components:', { year, month, day });
      
      // Create a UTC date with the same year/month/day
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const result = utcDate.toISOString();
      
      console.log('normalizeApiDate result:', result);
      return result;
    }
    
    return undefined;
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
