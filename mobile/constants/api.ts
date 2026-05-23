// API base URLs — sourced from app.json `expo.extra` so they can be tuned per
// environment without code changes. `__DEV__` is a Metro compile-time flag
// (true in Expo Go / debug builds, false in production bundles).

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

interface ExtraConfig {
  apiBaseUrl?: string;
  apiBaseUrlDev?: string;
  websiteUrl?: string;
  websiteUrlDev?: string;
  whatsappBusinessNumber?: string;
}

const extra = (Constants?.expoConfig?.extra ?? {}) as ExtraConfig;

const PROD_API = "https://admin.aagamholidays.com";
const PROD_WEBSITE = "https://aagamholidays.com";

/** Android emulator loopback to dev machine; iOS Simulator uses localhost instead. */
const ANDROID_LOOPBACK = "10.0.2.2";

function isAndroidEmulator(): boolean {
  return Platform.OS === "android" && Device.isDevice !== true;
}

function normalizeDevApiBase(configured?: string): string {
  const fallback = isAndroidEmulator()
    ? `http://${ANDROID_LOOPBACK}:3000`
    : "http://127.0.0.1:3000";
  const raw = (configured?.trim() || fallback).replace(/\/$/, "");
  // app.json often ships Android emulator host — unusable on iOS Simulator
  if (Platform.OS === "ios" && raw.includes(ANDROID_LOOPBACK)) {
    return raw.replace(ANDROID_LOOPBACK, "localhost");
  }
  // localhost on Android emulator points at the device, not your PC
  if (isAndroidEmulator() && /\b(localhost|127\.0\.0\.1)\b/i.test(raw)) {
    return raw
      .replace(/\b127\.0\.0\.1\b/gi, ANDROID_LOOPBACK)
      .replace(/\blocalhost\b/gi, ANDROID_LOOPBACK);
  }
  return raw;
}

function normalizeDevWebsiteUrl(configured?: string): string {
  const fallback = isAndroidEmulator()
    ? `http://${ANDROID_LOOPBACK}:3000/travel`
    : "http://127.0.0.1:3000/travel";
  const raw = (configured?.trim() || fallback).replace(/\/$/, "");
  if (Platform.OS === "ios" && raw.includes(ANDROID_LOOPBACK)) {
    return raw.replace(ANDROID_LOOPBACK, "localhost");
  }
  if (isAndroidEmulator() && /\b(localhost|127\.0\.0\.1)\b/i.test(raw)) {
    return raw
      .replace(/\b127\.0\.0\.1\b/gi, ANDROID_LOOPBACK)
      .replace(/\blocalhost\b/gi, ANDROID_LOOPBACK);
  }
  return raw;
}

export const API_BASE_URL = __DEV__
  ? normalizeDevApiBase(extra.apiBaseUrlDev)
  : extra.apiBaseUrl ?? PROD_API;

export const WEBSITE_URL = __DEV__
  ? normalizeDevWebsiteUrl(extra.websiteUrlDev)
  : extra.websiteUrl ?? PROD_WEBSITE;

/**
 * Public web URL for a tour package detail page (`/travel/packages/[slug]`).
 * `WEBSITE_URL` is either `https://aagamholidays.com` (prod) or ends with `/travel` in dev.
 */
export function buildTravelPackageUrl(
  websiteUrl: string,
  slug?: string | null,
  id?: string | null
): string {
  const raw =
    (slug != null && String(slug).trim() !== "" ? String(slug).trim() : null) ??
    (id != null && String(id).trim() !== "" ? String(id).trim() : "");
  const segment = encodeURIComponent(raw);
  const base = websiteUrl.replace(/\/$/, "");
  if (base.endsWith("/travel")) {
    return `${base}/packages/${segment}`;
  }
  return `${base}/travel/packages/${segment}`;
}

export function getTravelPackageUrl(
  slug?: string | null,
  id?: string | null
): string {
  return buildTravelPackageUrl(WEBSITE_URL, slug, id);
}
