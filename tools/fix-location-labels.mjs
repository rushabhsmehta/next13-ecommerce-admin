/**
 * Normalize location.label display casing (trim, title-case words).
 *
 * Usage:
 *   node tools/fix-location-labels.mjs          # dry run
 *   node tools/fix-location-labels.mjs --apply  # write changes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const UPPERCASE_TOKENS = new Set(["hp", "uae", "uk", "usa"]);

function titleCaseWord(word) {
  if (!word) return word;
  if (word === "&") return "&";
  // Keep hyphenated segments title-cased: "Kolkata-Odisha"
  return word
    .split("-")
    .map((part) => {
      const lower = part.toLowerCase();
      if (UPPERCASE_TOKENS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("-");
}

export function normalizeLocationLabel(label) {
  if (!label) return label;
  const trimmed = label.trim().replace(/\s+/g, " ");
  return trimmed
    .split(" ")
    .map((token) => titleCaseWord(token))
    .join(" ")
    .replace(/\s+&\s+/g, " & ");
}

async function main() {
  const locations = await prisma.location.findMany({
    select: { id: true, label: true },
  });

  const updates = locations
    .map((loc) => ({
      id: loc.id,
      from: loc.label,
      to: normalizeLocationLabel(loc.label),
    }))
    .filter((u) => u.from !== u.to);

  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Labels to update: ${updates.length}`);
  for (const u of updates) {
    console.log(`  "${u.from}" -> "${u.to}"`);
  }

  if (!apply) {
    console.log("\nRe-run with --apply to persist.");
    return;
  }

  for (const u of updates) {
    await prisma.location.update({
      where: { id: u.id },
      data: { label: u.to },
    });
  }
  console.log(`\nUpdated ${updates.length} location labels.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
