export function parseSelectedVariantIds(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
      }
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") {
    const n = parseInt(value.replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(n) ? Math.max(0, n) : fallback;
  }
  return fallback;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

import { ApiError } from "@/lib/api";

export function formatApiValidationError(err: unknown): string {
  if (!(err instanceof ApiError) || !err.details || typeof err.details !== "object") {
    return err instanceof ApiError ? err.message : "Could not save changes.";
  }
  const flat = err.details as {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
  const parts: string[] = [];
  for (const msg of flat.formErrors ?? []) {
    if (msg.trim()) parts.push(msg);
  }
  for (const [field, messages] of Object.entries(flat.fieldErrors ?? {})) {
    if (messages?.length) {
      const label = field.includes("occupancyTypeId")
        ? "Room occupancy is required on each itinerary day"
        : field.includes("itineraries")
          ? field.replace(/\.\d+\./g, " day ").replace(/\./g, " ")
          : field;
      parts.push(`${label}: ${messages[0]}`);
    }
  }
  return parts.length > 0 ? `${err.message}\n${parts.join("\n")}` : err.message;
}
