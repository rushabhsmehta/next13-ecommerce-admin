// WhatsApp business contact constants. Single source of truth for the public
// support number used in `wa.me` deep links and tel: actions across the app.
// Override at build time via `app.json` -> `expo.extra.whatsappBusinessNumber`.

import Constants from "expo-constants";

const FALLBACK = "919724444701";

const extra = (Constants?.expoConfig?.extra ?? {}) as {
  whatsappBusinessNumber?: string;
};

const raw = (extra.whatsappBusinessNumber ?? FALLBACK).replace(/\D/g, "");

export const WHATSAPP_BUSINESS_NUMBER = raw;
export const WHATSAPP_BUSINESS_NUMBER_E164 = `+${raw}`;

export function buildWaMeUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function buildTelUrl(): string {
  return `tel:${WHATSAPP_BUSINESS_NUMBER_E164}`;
}
