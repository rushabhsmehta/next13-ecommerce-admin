/**
 * Align tourPackage.tourCategory with location (Domestic vs International).
 *
 * Usage:
 *   node tools/fix-tour-categories.mjs          # dry run
 *   node tools/fix-tour-categories.mjs --apply  # write changes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

/**
 * Explicit international destinations on the travel site.
 * All other active locations default to Domestic (India).
 */
const INTERNATIONAL_LOCATIONS = new Set([
  "australia",
  "azerbaijan",
  "bali",
  "bhutan",
  "china",
  "croatia",
  "dubai",
  "east africa",
  "egypt",
  "europe",
  "georgia",
  "hong kong",
  "kazakhstan",
  "malaysia",
  "maldives",
  "mauritius",
  "nepal",
  "seychelles",
  "singapore",
  "singapore malaysia thailand",
  "sri lanka",
  "srilanka",
  "switzerland",
  "thailand",
  "turkiye",
  "vietnam",
]);

function normalizeLabel(label) {
  return (label || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function expectedCategoryForLocation(label) {
  const normalized = normalizeLabel(label);
  if (!normalized || normalized === "no location") return null;

  return INTERNATIONAL_LOCATIONS.has(normalized)
    ? "International"
    : "Domestic";
}

async function main() {
  // Also fix featured website packages wrongly tagged International on domestic locations.
  const packages = await prisma.tourPackage.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      tourPackageName: true,
      tourCategory: true,
      isFeatured: true,
      location: { select: { id: true, label: true } },
    },
  });

  const updates = [];

  for (const pkg of packages) {
    const expected = expectedCategoryForLocation(pkg.location?.label);
    if (!expected) continue;

    const current = pkg.tourCategory?.trim() || "Domestic";
    if (current === expected) continue;

    updates.push({
      id: pkg.id,
      name: pkg.tourPackageName,
      location: pkg.location?.label,
      featured: pkg.isFeatured,
      from: current,
      to: expected,
    });
  }

  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Packages to update: ${updates.length}`);

  const byLocation = {};
  for (const u of updates) {
    if (!byLocation[u.location]) byLocation[u.location] = { toIntl: 0, toDom: 0 };
    if (u.to === "International") byLocation[u.location].toIntl += 1;
    else byLocation[u.location].toDom += 1;
  }
  console.log("By location:", JSON.stringify(byLocation, null, 2));

  for (const u of updates.slice(0, 40)) {
    console.log(
      `  [${u.featured ? "featured" : "other"}] ${u.location}: "${u.from}" -> "${u.to}" | ${(u.name || "").slice(0, 60)}`
    );
  }
  if (updates.length > 40) {
    console.log(`  ... and ${updates.length - 40} more`);
  }

  if (!apply) {
    console.log("\nRe-run with --apply to persist.");
    return;
  }

  let changed = 0;
  for (const u of updates) {
    await prisma.tourPackage.update({
      where: { id: u.id },
      data: { tourCategory: u.to },
    });
    changed += 1;
  }
  console.log(`\nUpdated ${changed} tour packages.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
