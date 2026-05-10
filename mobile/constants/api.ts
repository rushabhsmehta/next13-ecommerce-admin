// API base URLs — sourced from app.json `expo.extra` so they can be tuned per
// environment without code changes. `__DEV__` is a Metro compile-time flag
// (true in Expo Go / debug builds, false in production bundles).

import Constants from "expo-constants";
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

function normalizeDevApiBase(configured?: string): string {
  const fallback =
    Platform.OS === "android"
      ? `http://${ANDROID_LOOPBACK}:3000`
      : "http://localhost:3000";
  const raw = (configured?.trim() || fallback).replace(/\/$/, "");
  // app.json often ships Android emulator host — unusable on iOS Simulator
  if (Platform.OS === "ios" && raw.includes(ANDROID_LOOPBACK)) {
    return raw.replace(ANDROID_LOOPBACK, "localhost");
  }
  // localhost on Android emulator points at the device, not your PC
  if (Platform.OS === "android" && /\b(localhost|127\.0\.0\.1)\b/i.test(raw)) {
    return raw
      .replace(/\b127\.0\.0\.1\b/gi, ANDROID_LOOPBACK)
      .replace(/\blocalhost\b/gi, ANDROID_LOOPBACK);
  }
  return raw;
}

function normalizeDevWebsiteUrl(configured?: string): string {
  const fallback =
    Platform.OS === "android"
      ? `http://${ANDROID_LOOPBACK}:3000/travel`
      : "http://localhost:3000/travel";
  const raw = (configured?.trim() || fallback).replace(/\/$/, "");
  if (Platform.OS === "ios" && raw.includes(ANDROID_LOOPBACK)) {
    return raw.replace(ANDROID_LOOPBACK, "localhost");
  }
  if (Platform.OS === "android" && /\b(localhost|127\.0\.0\.1)\b/i.test(raw)) {
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
