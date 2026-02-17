// API base URL - points to the Next.js backend
// In production, this would be https://admin.aagamholidays.com
// The travel website is served at https://aagamholidays.com (Next.js /travel routes)
// The mobile app connects to the same backend API

export const API_BASE_URL = __DEV__
  ? "http://localhost:3000"
  : "https://admin.aagamholidays.com";

export const WEBSITE_URL = __DEV__
  ? "http://localhost:3000/travel"
  : "https://aagamholidays.com";
