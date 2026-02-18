// API base URL - points to the Next.js backend
// In production, this would be https://admin.aagamholidays.com
// The travel website is served at https://aagamholidays.com (Next.js /travel routes)
// The mobile app connects to the same backend API

// DEV: use local development host reachable from your phone (LAN IP)
export const API_BASE_URL = __DEV__
  ? " 10.80.136.40:3000"
  : "https://admin.aagamholidays.com";

// DEV: mobile app will use the local backend's /travel path when in development
export const WEBSITE_URL = __DEV__
  ? " 10.80.136.40:3000/travel"
  : "https://aagamholidays.com";
