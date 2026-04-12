// API base URL - points to the Next.js backend
// __DEV__ is a compile-time constant (true in Expo Go, false in production bundles)
// This is resolved by Metro at bundle time — never depends on env vars or shell state.

export const API_BASE_URL = __DEV__
  ? "http://192.168.29.133:3000"
  : "https://admin.aagamholidays.com";

export const WEBSITE_URL = __DEV__
  ? "http://192.168.29.133:3000/travel"
  : "https://aagamholidays.com";
