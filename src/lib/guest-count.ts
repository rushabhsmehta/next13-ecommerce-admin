import { z } from "zod";

/**
 * TourPackageQuery stores guest counts as String? while Inquiry uses Int.
 * Never required — accept string/number/empty/missing without blocking submit.
 */
export const guestCountField = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number" && Number.isNaN(val)) return undefined;
  if (val === "") return "";
  return String(val);
}, z.string().optional());
