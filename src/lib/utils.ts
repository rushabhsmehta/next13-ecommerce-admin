import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  
  // For PDF export, return Indian number format with rupee notation
  if (forPDF) {
    // Format with Indian number system (lakh, crore)
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "decimal",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    return `₹ ${formatter.format(numericPrice)}/-`;
  }

  // For UI display, use currency symbol with proper Indian number formatting
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}
