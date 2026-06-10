/**
 * Resolve Aagam Holidays Google Place ID (ChIJ…) via Places API (New) Text Search.
 *
 * Prerequisites:
 *   - Places API (New) enabled in Google Cloud Console
 *   - GOOGLE_PLACES_API_KEY in .env.local (or GEMINI_API_KEY fallback)
 *
 * Usage:
 *   node tools/find-google-place-id.mjs
 *   node tools/find-google-place-id.mjs "Aagam Holidays PNTC Satellite Ahmedabad"
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const apiKey =
  process.env.GOOGLE_PLACES_API_KEY?.trim() ||
  process.env.GEMINI_API_KEY?.trim();

const DEFAULT_QUERY =
  "Aagam Holidays B-1203 PNTC Times Of India Press Rd Satellite Ahmedabad";

const textQuery = process.argv[2]?.trim() || DEFAULT_QUERY;

const BUSINESS_URL =
  "https://www.google.com/maps/place/Aagam+Holidays/@23.009581,72.5229068,17z/data=!3m1!4b1!4m6!3m5!1s0x395e86a35625c497:0x1ec3f9fdb46be0bd!8m2!3d23.009581!4d72.5229068!16s%2Fg%2F11ptsd7wdr";

if (!apiKey) {
  console.error(
    "Missing API key. Add GOOGLE_PLACES_API_KEY to .env.local (from Google Cloud → Credentials)."
  );
  process.exit(1);
}

const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
].join(",");

const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": fieldMask,
  },
  body: JSON.stringify({ textQuery }),
});

const data = await res.json();

if (!res.ok) {
  console.error("Places API error:", JSON.stringify(data, null, 2));
  process.exit(1);
}

const places = data.places ?? [];

if (places.length === 0) {
  console.error("No places found for:", textQuery);
  process.exit(1);
}

console.log(`\nFound ${places.length} result(s) for: "${textQuery}"\n`);

for (const [i, place] of places.entries()) {
  console.log(`--- [${i + 1}] ${place.displayName?.text ?? "?"}`);
  console.log(`    Address:  ${place.formattedAddress ?? "—"}`);
  console.log(`    Rating:   ${place.rating ?? "—"} (${place.userRatingCount ?? 0} reviews)`);
  console.log(`    Place ID: ${place.id}`);
  if (place.googleMapsUri) console.log(`    Maps:     ${place.googleMapsUri}`);
  console.log();
}

const best = places[0];
console.log("Add to .env.local and Vercel:\n");
console.log(`NEXT_PUBLIC_GOOGLE_PLACE_ID=${best.id}`);
console.log(
  `NEXT_PUBLIC_GOOGLE_BUSINESS_URL=${process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL?.trim() || BUSINESS_URL}`
);
console.log(`GOOGLE_PLACES_API_KEY=<your-api-key-from-same-google-cloud-project>`);
