import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date string or Date object consistently, preserving the original date
 * regardless of timezone issues
 */
export function formatSafeDate(dateInput: string | Date, formatString: string = "dd MMM yyyy"): string {
  try {
    // If it's already a Date object, format it directly
    if (dateInput instanceof Date) {
      // Create a new date with only the date portion to avoid timezone issues
      const year = dateInput.getFullYear();
      const month = dateInput.getMonth();
      const day = dateInput.getDate();
      const safeDateObj = new Date(year, month, day);
      return format(safeDateObj, formatString);
    }
    
    // If it's an ISO string, parse it first then format
    if (typeof dateInput === "string") {
      // Extract just the date portion from the ISO string to avoid timezone shifts
      const datePart = dateInput.split('T')[0];
      const safeDateObj = parseISO(datePart);
      return format(safeDateObj, formatString);
    }
    
    return "Invalid date";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}


export function formatPrice(
  price: number | string,
  options: {
    currency?: "USD" | "EUR" | "GBP" | "BDT" | "INR";
    notation?: Intl.NumberFormatOptions["notation"];
    forPDF?: boolean;
  } = {}
) {
  const { currency = "INR", notation = "standard", forPDF = false } = options;
  
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  // For PDF export, return clean number format without currency symbols
  if (forPDF) {
    // Format with Indian number system (lakh, crore) but without currency prefix
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "decimal",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    return formatter.format(numericPrice);
  }

  // For UI display, use currency symbol with proper Indian number formatting
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}
