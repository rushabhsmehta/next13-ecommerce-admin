/**
 * Shared text utility functions for PDF generation.
 * Consolidates sanitizeText, extractText, parsePolicyField, and renderBulletList
 * that were duplicated across all PDF generators.
 */

import { brandColors } from "./branding";

/**
 * Sanitize a value into a safe display string.
 * Returns the fallback if the value is null, undefined, empty, "null", "undefined", or "NaN".
 */
export function sanitizeText(value: any, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (
    !text ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "undefined" ||
    text === "NaN"
  ) {
    return fallback;
  }
  return text;
}

/**
 * Extract text from an object by trying common text-like keys.
 * Falls back to String(obj) if no known key is found.
 */
export function extractText(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  for (const k of ["text", "value", "description", "label", "name"]) {
    if (obj[k]) return String(obj[k]);
  }
  return String(obj);
}

/**
 * Parse a policy field (string/JSON/array/object) into an array of plain-text items.
 * Handles all common data formats including JSON strings, bullet-separated text, and nested objects.
 */
export function parsePolicyField(field: any): string[] {
  const items: string[] = [];

  const pushValue = (val: any) => {
    const text = sanitizeText(val);
    if (text) items.push(text);
  };

  const walk = (input: any) => {
    if (Array.isArray(input)) {
      input.forEach(walk);
      return;
    }
    if (input && typeof input === "object") {
      // Try known text keys first
      const extracted = extractText(input);
      if (extracted && extracted !== "[object Object]") {
        pushValue(extracted);
      } else {
        Object.values(input).forEach(walk);
      }
      return;
    }
    if (typeof input === "string") {
      input
        .split(/\n|•|-|\u2022/)
        .map((piece) => piece.trim())
        .filter(Boolean)
        .forEach(pushValue);
      return;
    }
    if (input !== null && input !== undefined) {
      pushValue(input);
    }
  };

  if (!field) return items;

  try {
    if (typeof field === "string") {
      try {
        const parsed = JSON.parse(field);
        walk(parsed);
      } catch {
        walk(field);
      }
    } else {
      walk(field);
    }
  } catch (error) {
    console.error("Failed to parse policy field", error);
  }

  return items;
}

/**
 * Render an array of string items as an HTML bullet list.
 */
export function renderBulletList(
  items: string[],
  bulletColor = brandColors.secondary,
  textColor = brandColors.text
): string {
  return items
    .map(
      (item) => `
      <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
        <span style="color: ${bulletColor}; font-size: 14px; line-height: 1;">&#8226;</span>
        <span style="color: ${textColor}; font-size: 13px; line-height: 1.5;">${item}</span>
      </div>
    `
    )
    .join("");
}
