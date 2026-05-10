// API base URLs — sourced from app.json `expo.extra` so they can be tuned per
// environment without code changes. `__DEV__` is a Metro compile-time flag
// (true in Expo Go / debug builds, false in production bundles).

import Constants from "expo-constants";

interface ExtraConfig {
  apiBaseUrl?: string;
  apiBaseUrlDev?: string;
  websiteUrl?: string;
  websiteUrlDev?: string;
  whatsappBusinessNumber?: string;
}

const extra = (Constants?.expoConfig?.extra ?? {}) as ExtraConfig;

const PROD_API = "https://admin.aagamholidays.com";
const DEV_API = "http://10.0.2.2:3000";
const PROD_WEBSITE = "https://aagamholidays.com";
const DEV_WEBSITE = "http://10.0.2.2:3000/travel";

export const API_BASE_URL = __DEV__
  ? extra.apiBaseUrlDev ?? DEV_API
  : extra.apiBaseUrl ?? PROD_API;

export const WEBSITE_URL = __DEV__
  ? extra.websiteUrlDev ?? DEV_WEBSITE
  : extra.websiteUrl ?? PROD_WEBSITE;
