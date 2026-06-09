/**
 * Normalize malformed location and tour-package slugs (trailing hyphens, etc.).
 *
 * Usage:
 *   node tools/fix-malformed-slugs.mjs          # dry run
 *   node tools/fix-malformed-slugs.mjs --apply  # write changes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function normalizeSlug(slug) {
  if (!slug) return null;
  const cleaned = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || null;
}

function slugifyFromName(name) {
  if (!name) return null;
  return normalizeSlug(name);
}

function collectUpdates(rows, labelField) {
  const occupied = new Map();

  for (const row of rows) {
    const current = row.slug?.trim() || null;
    const normalized = normalizeSlug(current);
    if (normalized && normalized === current) {
      occupied.set(normalized, row.id);
    }
  }

  const updates = [];

  for (const row of rows) {
    const current = row.slug?.trim() || null;
    let target = normalizeSlug(current);

    if (!target && labelField && row[labelField]) {
      target = slugifyFromName(row[labelField]);
    }

    if (!target || target === current) continue;

    let finalSlug = target;
    const owner = occupied.get(finalSlug);
    if (owner && owner !== row.id) {
      let suffix = 2;
      while (occupied.has(`${target}-${suffix}`)) suffix += 1;
      finalSlug = `${target}-${suffix}`;
    }

    occupied.set(finalSlug, row.id);
    updates.push({
      id: row.id,
      name: labelField ? row[labelField] : row.id,
      from: current,
      to: finalSlug,
    });
  }

  return updates;
}

async function main() {
  const [locations, packages] = await Promise.all([
    prisma.location.findMany({
      select: { id: true, label: true, slug: true },
    }),
    prisma.tourPackage.findMany({
      select: { id: true, tourPackageName: true, slug: true },
    }),
  ]);

  const locationUpdates = collectUpdates(locations, "label");
  const packageUpdates = collectUpdates(packages, "tourPackageName");

  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Locations to fix: ${locationUpdates.length}`);
  for (const u of locationUpdates) {
    console.log(`  [location] ${u.name}: "${u.from}" -> "${u.to}"`);
  }

  console.log(`Tour packages to fix: ${packageUpdates.length}`);
  for (const u of packageUpdates) {
    console.log(`  [package] ${u.name}: "${u.from}" -> "${u.to}"`);
  }

  if (!apply) {
    console.log("\nNo changes written. Re-run with --apply to update the database.");
    return;
  }

  for (const u of locationUpdates) {
    await prisma.location.update({
      where: { id: u.id },
      data: { slug: u.to },
    });
  }

  for (const u of packageUpdates) {
    await prisma.tourPackage.update({
      where: { id: u.id },
      data: { slug: u.to },
    });
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
