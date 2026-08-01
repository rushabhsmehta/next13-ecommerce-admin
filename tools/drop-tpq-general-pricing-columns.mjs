/**
 * Drop TourPackageQuery general pricing columns after backfill.
 * Usage: node tools/drop-tpq-general-pricing-columns.mjs
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
if (existsSync(resolve(root, ".env.local"))) {
  loadEnv({ path: resolve(root, ".env.local"), quiet: true, override: true });
}
loadEnv({ path: resolve(root, ".env"), quiet: true });

const prisma = new PrismaClient();

const columns = [
  "price",
  "pricePerAdult",
  "pricePerChild5to12YearsNoBed",
  "pricePerChildOrExtraBed",
  "pricePerChildwithSeatBelow5Years",
  "totalPrice",
  "pricingSection",
  "pricingCalculationMethod",
];

async function columnExists(column) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'TourPackageQuery'
      AND COLUMN_NAME = ?
    `,
    column
  );
  return Number(rows?.[0]?.cnt ?? 0) > 0;
}

async function main() {
  // Safety: ensure every row with old general pricing has usable variant pricing OR legacy seed.
  const remaining = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM TourPackageQuery
    WHERE
      (
        (totalPrice IS NOT NULL AND TRIM(totalPrice) <> '' AND TRIM(totalPrice) <> '0')
        OR (pricingSection IS NOT NULL AND pricingSection <> CAST('null' AS JSON) AND pricingSection <> CAST('[]' AS JSON))
      )
      AND (
        variantPricingData IS NULL
        OR JSON_LENGTH(variantPricingData) = 0
      )
  `).catch(() => null);

  if (remaining) {
    console.log("precheck remaining general-without-variants:", Number(remaining?.[0]?.cnt ?? -1));
  }

  for (const column of columns) {
    const exists = await columnExists(column);
    if (!exists) {
      console.log(`skip ${column} (already dropped)`);
      continue;
    }
    console.log(`dropping ${column}...`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`TourPackageQuery\` DROP COLUMN \`${column}\``
    );
    console.log(`dropped ${column}`);
  }

  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
