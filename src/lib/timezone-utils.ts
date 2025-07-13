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
  console.log('🔧 dateToUtc function called:');
  console.log('  - Input date:', date);
  console.log('  - Input type:', typeof date);
  console.log('  - Timezone:', timezone);
  
  if (!date) {
    console.log('  - Returning undefined (no date)');
    return undefined;
  }
  
  const tz = timezone || getUserTimezone();
  console.log('  - Using timezone:', tz);
  
  try {
    // If it's already a Date object, ensure it's treated as local date
    if (date instanceof Date) {
      console.log('  - Processing Date object:');
      console.log('    - Original date:', date.toString());
      console.log('    - toISOString():', date.toISOString());
      
      // Get the date components in local timezone (no getUTC* methods)
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      console.log('    - Extracted components:', { year, month, day });
      
      // Create a UTC date with the same year/month/day components
      // Use a fixed time (noon) to avoid any DST issues
      const utcDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      console.log('    - Created UTC date:', utcDate.toString());
      console.log('    - UTC date ISO:', utcDate.toISOString());
      return utcDate;
    }
    
    // If it's a string, parse it and extract components to avoid timezone conversion
    console.log('  - Processing string date:');
    const parsedDate = parseISO(date);
    console.log('    - Parsed date:', parsedDate.toString());
    
    // Extract components from the parsed date
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth();
    const day = parsedDate.getDate();
    console.log('    - Extracted components:', { year, month, day });
    
    // Create UTC date with same components and fixed time (noon)
    const result = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    console.log('    - Final UTC result:', result.toString());
    console.log('    - Final UTC ISO:', result.toISOString());
    return result;
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
    
    // For date-only fields stored as UTC, extract the date components
    // and create a local date with the same year/month/day
    if (date instanceof Date) {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      
      // Create local date with same date components
      const result = new Date(year, month, day);
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
  console.log('📝 formatLocalDate function called:');
  console.log('  - Input date:', date);
  console.log('  - Input type:', typeof date);
  console.log('  - Format string:', formatStr);
  console.log('  - Timezone:', timezone);
  
  if (!date) {
    console.log('  - Returning empty string (no date)');
    return '';
  }
  
  const tz = timezone || getUserTimezone();
  console.log('  - Using timezone:', tz);
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    console.log('  - Date object for formatting:', dateObj);
    console.log('  - Date object toString():', dateObj.toString());
    console.log('  - Date object getDate():', dateObj.getDate());
    console.log('  - Date object getMonth():', dateObj.getMonth());
    console.log('  - Date object getFullYear():', dateObj.getFullYear());
    
    const formatted = formatInTimeZone(dateObj, tz, formatStr);
    console.log('  - Formatted result:', formatted);
    return formatted;
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
  console.log('🔄 normalizeApiDate function called:');
  console.log('  - Input date:', date);
  console.log('  - Input type:', typeof date);
  
  if (!date) {
    console.log('  - Returning undefined (no date)');
    return undefined;
  }
  
  try {
    // For date-only fields, we want to preserve the date components
    // and store as UTC date with same year/month/day
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    console.log('  - Date object:', dateObj);
    console.log('  - Date object toString():', dateObj.toString());
    
    if (dateObj instanceof Date) {
      // Extract date components from the local date
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      console.log('  - Extracted components:', { year, month, day });
      
      // Create a UTC date with the same year/month/day
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      console.log('  - Created UTC date:', utcDate);
      console.log('  - UTC date toString():', utcDate.toString());
      console.log('  - UTC date getDate():', utcDate.getDate());
      console.log('  - UTC date getMonth():', utcDate.getMonth());
      console.log('  - UTC date getFullYear():', utcDate.getFullYear());
      
      const result = utcDate.toISOString();
      console.log('  - Final ISO string result:', result);
      
      return result;
    }
    
    console.log('  - Not a Date instance, returning undefined');
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
  console.log('📅 createDatePickerValue function called:');
  console.log('  - Input dateValue:', dateValue);
  console.log('  - Input type:', typeof dateValue);
  
  if (!dateValue) {
    console.log('  - Returning undefined (no dateValue)');
    return undefined;
  }
  
  try {
    // For date pickers, we want to show the local date without timezone conversion
    if (typeof dateValue === 'string') {
      console.log('  - Processing string dateValue:');
      // If it's an ISO string from database, convert to local
      const result = utcToLocal(dateValue) || undefined;
      console.log('  - utcToLocal result:', result);
      console.log('  - utcToLocal result toString():', result?.toString());
      return result;
    }
    
    // If it's already a Date object, use as-is
    console.log('  - Using Date object as-is:', dateValue);
    console.log('  - Date toString():', dateValue.toString());
    return dateValue instanceof Date ? dateValue : undefined;
  } catch (error) {
    console.error('Error creating date picker value:', error);
    return undefined;
  }
}
