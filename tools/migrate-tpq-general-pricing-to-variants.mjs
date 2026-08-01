/**
 * One-time backfill: move TourPackageQuery general pricing into variantPricingData
 * before dropping general pricing columns.
 *
 * Uses raw SQL so it still works after schema.prisma no longer declares those columns
 * (as long as the physical MySQL columns still exist).
 *
 * Usage (from repo root, with DATABASE_URL loaded):
 *   node tools/migrate-tpq-general-pricing-to-variants.mjs
 *   node tools/migrate-tpq-general-pricing-to-variants.mjs --dry-run
 */

import { config as loadEnv } from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
if (existsSync(resolve(root, ".env.local"))) {
  loadEnv({ path: resolve(root, ".env.local"), quiet: true, override: true });
}
loadEnv({ path: resolve(root, ".env"), quiet: true });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

function parsePositiveNumber(value) {
  if (value == null) return null;
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function hasUsableVariantPricing(variantPricingData) {
  const data = parseJson(variantPricingData);
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return parsePositiveNumber(entry.totalCost) != null;
  });
}

function normalizePricingSection(pricingSection) {
  const parsed = parseJson(pricingSection);
  if (Array.isArray(parsed)) return parsed;
  return [];
}

function buildComponentsFromGeneral(pricingSection, totalPrice) {
  const rows = normalizePricingSection(pricingSection);
  const components = rows
    .filter((row) => row && (row.name || row.price != null))
    .map((row) => ({
      name: String(row.name ?? "Item"),
      price: row.price == null ? "" : String(row.price),
      description: row.description ?? "",
    }));

  if (components.length === 0) {
    const total = parsePositiveNumber(totalPrice);
    if (total != null) {
      components.push({
        name: "Total Package Cost",
        price: String(total),
        description: "Migrated from legacy general pricing",
      });
    }
  }

  const fromComponents = components.reduce((sum, c) => {
    const n = parsePositiveNumber(c.price);
    return sum + (n ?? 0);
  }, 0);

  const totalCost =
    parsePositiveNumber(totalPrice) ?? (fromComponents > 0 ? fromComponents : null);

  return { components, totalCost };
}

async function main() {
  // Raw select — columns may already be removed from Prisma schema.
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      id,
      price,
      totalPrice,
      pricingSection,
      variantPricingData,
      customQueryVariants,
      confirmedVariantId
    FROM TourPackageQuery
  `);

  let skippedHasVariants = 0;
  let skippedNoGeneral = 0;
  let skippedAlreadySeeded = 0;
  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    if (hasUsableVariantPricing(row.variantPricingData)) {
      skippedHasVariants += 1;
      continue;
    }

    const existingCustom = Array.isArray(parseJson(row.customQueryVariants))
      ? parseJson(row.customQueryVariants)
      : [];
    const alreadySeeded = existingCustom.find(
      (v) => v && (v.source === "legacy_general" || v.name === "Legacy Pricing")
    );
    if (alreadySeeded) {
      // Idempotent resume: prior partial run already wrote the seeded variant.
      skippedAlreadySeeded += 1;
      continue;
    }

    const { components, totalCost } = buildComponentsFromGeneral(
      row.pricingSection,
      row.totalPrice || row.price
    );

    if (totalCost == null && components.length === 0) {
      skippedNoGeneral += 1;
      continue;
    }

    const variantId = randomUUID();
    const customQueryVariants = [
      ...existingCustom,
      {
        id: variantId,
        name: "Legacy Pricing",
        description: "Migrated from legacy general pricing before column drop",
        sortOrder: existingCustom.length,
        source: "legacy_general",
      },
    ];

    const existingPricing =
      parseJson(row.variantPricingData) &&
      typeof parseJson(row.variantPricingData) === "object"
        ? parseJson(row.variantPricingData)
        : {};

    const variantPricingData = {
      ...existingPricing,
      [variantId]: {
        calculationMethod: "manual",
        components,
        totalCost: totalCost ?? 0,
        remarks: "Migrated from legacy general pricing",
        updatedAt: new Date().toISOString(),
      },
    };

    const confirmedVariantId =
      row.confirmedVariantId || (totalCost != null ? variantId : null);

    if (dryRun) {
      migrated += 1;
      console.log(
        `[dry-run] would migrate ${row.id} → variant ${variantId} total=${totalCost}`
      );
      continue;
    }

    try {
      await prisma.$executeRaw`
        UPDATE TourPackageQuery
        SET
          customQueryVariants = ${JSON.stringify(customQueryVariants)},
          variantPricingData = ${JSON.stringify(variantPricingData)},
          confirmedVariantId = ${confirmedVariantId}
        WHERE id = ${row.id}
      `;
      migrated += 1;
      if (migrated % 100 === 0) {
        console.log(`progress: migrated=${migrated}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`failed ${row.id}:`, err?.message || err);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        total: rows.length,
        migrated,
        failed,
        skippedHasVariants,
        skippedAlreadySeeded,
        skippedNoGeneral,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
