#!/usr/bin/env node
/**
 * Repair overlapping HotelPricing rows by re-applying the upsertPricingWithSplit algorithm.
 *
 * Default is dry-run. Use --apply to persist changes.
 *
 * Usage:
 *   node tools/repair-hotel-pricing-overlaps.mjs
 *   node tools/repair-hotel-pricing-overlaps.mjs --apply
 *   node tools/repair-hotel-pricing-overlaps.mjs --hotel-id=<uuid>
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const apply = process.argv.includes("--apply");
const hotelIdArg = process.argv.find((a) => a.startsWith("--hotel-id="));
const hotelIdFilter = hotelIdArg ? hotelIdArg.slice("--hotel-id=".length) : null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDisplayDate(d) {
  if (!d) return "";
  const x = new Date(d);
  return `${pad2(x.getUTCDate())}/${pad2(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`;
}

function startOfUtcDay(d) {
  const x = new Date(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

function daysInclusive(startMs, endMs) {
  return Math.floor((endMs - startMs) / MILLISECONDS_PER_DAY) + 1;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const s1 = startOfUtcDay(aStart);
  const e1 = startOfUtcDay(aEnd);
  const s2 = startOfUtcDay(bStart);
  const e2 = startOfUtcDay(bEnd);
  return s1 <= e2 && s2 <= e1;
}

function overlapRange(aStart, aEnd, bStart, bEnd) {
  const s1 = startOfUtcDay(aStart);
  const e1 = startOfUtcDay(aEnd);
  const s2 = startOfUtcDay(bStart);
  const e2 = startOfUtcDay(bEnd);
  if (s1 > e2 || s2 > e1) return null;
  const os = Math.max(s1, s2);
  const oe = Math.min(e1, e2);
  return { startMs: os, endMs: oe, days: daysInclusive(os, oe) };
}

function groupKey(row) {
  return [
    row.hotelId,
    row.roomTypeId || "",
    row.occupancyTypeId || "",
    row.mealPlanId || "",
  ].join("|");
}

function pricingKind(row) {
  return row.locationSeasonalPeriodId ? "Seasonal" : "Manual";
}

function classifyPair(a, b) {
  const ka = pricingKind(a);
  const kb = pricingKind(b);
  const types = [ka, kb].sort((x, y) => {
    if (x === y) return 0;
    return x === "Manual" ? -1 : 1;
  });
  return `${types[0]} vs ${types[1]}`;
}

function rangeDays(start, end) {
  return daysInclusive(startOfUtcDay(start), startOfUtcDay(end));
}

function pickIncomingRow(a, b) {
  const ka = pricingKind(a);
  const kb = pricingKind(b);
  if (ka === "Seasonal" && kb === "Manual") return a;
  if (kb === "Seasonal" && ka === "Manual") return b;
  const daysA = rangeDays(a.startDate, a.endDate);
  const daysB = rangeDays(b.startDate, b.endDate);
  return daysA <= daysB ? a : b;
}

function manualFullyContainsSeasonal(manual, seasonal) {
  const ms = startOfUtcDay(manual.startDate);
  const me = startOfUtcDay(manual.endDate);
  const ss = startOfUtcDay(seasonal.startDate);
  const se = startOfUtcDay(seasonal.endDate);
  return ms <= ss && me >= se;
}

function rowLabel(row) {
  const hotel = row.hotel?.name || row.hotelId;
  const room = row.roomType?.name || "(any)";
  const occ = row.occupancyType?.name || "(any)";
  const meal = row.mealPlan?.name || "(any)";
  const kind = pricingKind(row);
  const dates = `${formatDisplayDate(row.startDate)} – ${formatDisplayDate(row.endDate)}`;
  return `${hotel} | ${room} / ${occ} / ${meal} | ${kind} | ${dates} | ₹${row.price} | id=${row.id}`;
}

/** Find overlapping pricing periods for the same dimensional key (inline from hotel-pricing-overlap.ts) */
async function findOverlappingPeriods(tx, params) {
  return tx.hotelPricing.findMany({
    where: {
      hotelId: params.hotelId,
      roomTypeId: params.roomTypeId,
      occupancyTypeId: params.occupancyTypeId,
      mealPlanId: params.mealPlanId,
      isActive: true,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      AND: [
        { startDate: { lte: params.endDate } },
        { endDate: { gte: params.startDate } },
      ],
    },
    orderBy: { startDate: "asc" },
  });
}

/** Split overlapping periods and create/update the incoming row (inline from hotel-pricing-overlap.ts) */
async function upsertPricingWithSplit(tx, input, options = {}) {
  const overlappingPeriods = await findOverlappingPeriods(tx, {
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    occupancyTypeId: input.occupancyTypeId,
    mealPlanId: input.mealPlanId,
    startDate: input.startDate,
    endDate: input.endDate,
    excludeId: options.excludeId,
  });

  for (const period of overlappingPeriods) {
    const periodStart = period.startDate;
    const periodEnd = period.endDate;

    await tx.hotelPricing.delete({ where: { id: period.id } });

    if (periodStart < input.startDate) {
      const beforeEnd = new Date(input.startDate.getTime() - MILLISECONDS_PER_DAY);
      await tx.hotelPricing.create({
        data: {
          hotelId: input.hotelId,
          startDate: periodStart,
          endDate: beforeEnd,
          roomTypeId: period.roomTypeId,
          occupancyTypeId: period.occupancyTypeId,
          price: period.price,
          mealPlanId: period.mealPlanId,
          locationSeasonalPeriodId: period.locationSeasonalPeriodId,
          isActive: true,
        },
      });
    }

    if (periodEnd > input.endDate) {
      const afterStart = new Date(input.endDate.getTime() + MILLISECONDS_PER_DAY);
      await tx.hotelPricing.create({
        data: {
          hotelId: input.hotelId,
          startDate: afterStart,
          endDate: periodEnd,
          roomTypeId: period.roomTypeId,
          occupancyTypeId: period.occupancyTypeId,
          price: period.price,
          mealPlanId: period.mealPlanId,
          locationSeasonalPeriodId: period.locationSeasonalPeriodId,
          isActive: true,
        },
      });
    }
  }

  if (options.excludeId) {
    const existing = await tx.hotelPricing.findUnique({
      where: { id: options.excludeId },
    });
    if (existing) {
      return tx.hotelPricing.update({
        where: { id: options.excludeId },
        data: {
          startDate: input.startDate,
          endDate: input.endDate,
          roomTypeId: input.roomTypeId,
          occupancyTypeId: input.occupancyTypeId,
          mealPlanId: input.mealPlanId,
          price: input.price,
          locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
          isActive: input.isActive ?? true,
        },
      });
    }
  }

  return tx.hotelPricing.create({
    data: {
      hotelId: input.hotelId,
      startDate: input.startDate,
      endDate: input.endDate,
      roomTypeId: input.roomTypeId,
      occupancyTypeId: input.occupancyTypeId,
      price: input.price,
      mealPlanId: input.mealPlanId,
      locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

function toUpsertInput(row) {
  return {
    hotelId: row.hotelId,
    startDate: row.startDate,
    endDate: row.endDate,
    roomTypeId: row.roomTypeId,
    occupancyTypeId: row.occupancyTypeId,
    mealPlanId: row.mealPlanId,
    price: row.price,
    locationSeasonalPeriodId: row.locationSeasonalPeriodId ?? null,
    isActive: true,
  };
}

/**
 * Manual+seasonal: idempotent when no single manual row still fully contains the seasonal range.
 * Manual+manual: idempotent when incoming row has no remaining overlaps (excluding itself).
 */
function isRepairIdempotent(incoming, other, classification, rowsInGroup) {
  if (classification === "Manual vs Seasonal") {
    const seasonal = pricingKind(incoming) === "Seasonal" ? incoming : other;
    const manual = pricingKind(incoming) === "Seasonal" ? other : incoming;
    const wideManual = rowsInGroup.find(
      (r) =>
        !r.locationSeasonalPeriodId &&
        manualFullyContainsSeasonal(r, seasonal) &&
        rangesOverlap(r.startDate, r.endDate, seasonal.startDate, seasonal.endDate)
    );
    return !wideManual;
  }

  if (classification === "Manual vs Manual") {
    const overlappingOthers = rowsInGroup.filter(
      (r) =>
        r.id !== incoming.id &&
        rangesOverlap(r.startDate, r.endDate, incoming.startDate, incoming.endDate)
    );
    return overlappingOthers.length === 0;
  }

  return false;
}

function describeRepair(incoming, other, classification) {
  if (classification === "Manual vs Seasonal") {
    const seasonal = pricingKind(incoming) === "Seasonal" ? incoming : other;
    const manual = pricingKind(incoming) === "Seasonal" ? other : incoming;
    if (manualFullyContainsSeasonal(manual, seasonal)) {
      return `Split manual row around seasonal dates; keep seasonal row (${formatDisplayDate(seasonal.startDate)} – ${formatDisplayDate(seasonal.endDate)})`;
    }
    return `Re-apply upsert split for seasonal row over overlapping manual`;
  }
  if (classification === "Manual vs Manual") {
    return `Re-apply upsert split using narrower manual row as incoming`;
  }
  return "Re-apply upsert split";
}

function findOverlapPairs(groups) {
  const pairs = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (!rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) continue;
        const ov = overlapRange(a.startDate, a.endDate, b.startDate, b.endDate);
        pairs.push({
          groupKey: key,
          classification: classifyPair(a, b),
          overlapDays: ov.days,
          a,
          b,
        });
      }
    }
  }
  return pairs;
}

function buildRepairPlan(pairs, groups) {
  const actionByGroup = new Map();
  const skipped = {
    seasonalVsSeasonal: [],
    idempotent: [],
  };

  for (const pair of pairs) {
    if (pair.classification === "Seasonal vs Seasonal") {
      skipped.seasonalVsSeasonal.push(pair);
      continue;
    }

    const incoming = pickIncomingRow(pair.a, pair.b);
    const other = incoming.id === pair.a.id ? pair.b : pair.a;
    const rowsInGroup = groups.get(pair.groupKey) || [];

    if (isRepairIdempotent(incoming, other, pair.classification, rowsInGroup)) {
      skipped.idempotent.push({ pair, incoming, other });
      continue;
    }

    const candidate = {
      incoming,
      other,
      classification: pair.classification,
      groupKey: pair.groupKey,
      description: describeRepair(incoming, other, pair.classification),
      input: toUpsertInput(incoming),
      excludeId: incoming.id,
      hotelId: incoming.hotelId,
    };

    const existing = actionByGroup.get(pair.groupKey);
    if (!existing) {
      actionByGroup.set(pair.groupKey, candidate);
      continue;
    }

    // One repair per room/occupancy/meal group — prefer seasonal incoming over manual
    const existingSeasonal = !!existing.incoming.locationSeasonalPeriodId;
    const candidateSeasonal = !!incoming.locationSeasonalPeriodId;
    if (candidateSeasonal && !existingSeasonal) {
      actionByGroup.set(pair.groupKey, candidate);
    }
  }

  const actions = [...actionByGroup.values()].sort((x, y) => {
    const h = x.hotelId.localeCompare(y.hotelId);
    if (h !== 0) return h;
    return x.incoming.startDate - y.incoming.startDate;
  });

  return { actions, skipped };
}

async function loadPricingRows() {
  return prisma.hotelPricing.findMany({
    where: {
      isActive: true,
      ...(hotelIdFilter ? { hotelId: hotelIdFilter } : {}),
    },
    include: {
      hotel: { select: { name: true } },
      roomType: { select: { name: true } },
      occupancyType: { select: { name: true } },
      mealPlan: { select: { name: true } },
      locationSeasonalPeriod: { select: { name: true } },
    },
    orderBy: [{ hotelId: "asc" }, { startDate: "asc" }],
  });
}

function groupRows(pricingRows) {
  const groups = new Map();
  for (const row of pricingRows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

async function main() {
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  if (hotelIdFilter) console.log(`Hotel filter: ${hotelIdFilter}`);
  console.log("");

  const pricingRows = await loadPricingRows();
  const groups = groupRows(pricingRows);
  const pairs = findOverlapPairs(groups);
  const { actions, skipped } = buildRepairPlan(pairs, groups);

  const hotelsScanned = new Set(pricingRows.map((r) => r.hotelId)).size;
  const hotelsWithOverlaps = new Set(pairs.map((p) => p.a.hotelId)).size;
  const hotelsToRepair = new Set(actions.map((a) => a.hotelId)).size;

  if (actions.length === 0 && pairs.length === 0) {
    console.log("No overlapping active pricing rows found.");
  } else {
    console.log(`Overlap pairs found: ${pairs.length}`);
    console.log(`Repair actions planned: ${actions.length}`);
    console.log(`Skipped (Seasonal vs Seasonal): ${skipped.seasonalVsSeasonal.length}`);
    console.log(`Skipped (already idempotent): ${skipped.idempotent.length}`);
    console.log("");

    for (const action of actions) {
      console.log(`[${action.classification}] ${action.description}`);
      console.log(`  Incoming: ${rowLabel(action.incoming)}`);
      console.log(`  Overlaps: ${rowLabel(action.other)}`);
      console.log(
        `  Would run upsertPricingWithSplit for ${formatDisplayDate(action.input.startDate)} – ${formatDisplayDate(action.input.endDate)}`
      );
      console.log("");
    }

    if (skipped.seasonalVsSeasonal.length > 0) {
      console.log("--- Skipped: Seasonal vs Seasonal (manual review required) ---");
      for (const pair of skipped.seasonalVsSeasonal) {
        console.log(`  ${rowLabel(pair.a)}`);
        console.log(`  ↔ ${rowLabel(pair.b)} (${pair.overlapDays} overlap days)`);
      }
      console.log("");
    }

    if (skipped.idempotent.length > 0) {
      console.log("--- Skipped: already idempotent ---");
      for (const { pair, incoming } of skipped.idempotent) {
        console.log(
          `  ${pair.classification}: incoming ${incoming.id} (${formatDisplayDate(incoming.startDate)} – ${formatDisplayDate(incoming.endDate)})`
        );
      }
      console.log("");
    }
  }

  let applied = 0;
  let failed = 0;

  if (apply && actions.length > 0) {
    for (const action of actions) {
      const hotelName = action.incoming?.hotel?.name || action.hotelId;
      const incoming = await prisma.hotelPricing.findUnique({
        where: { id: action.incoming.id },
        include: {
          hotel: { select: { name: true } },
          roomType: { select: { name: true } },
          occupancyType: { select: { name: true } },
          mealPlan: { select: { name: true } },
        },
      });

      if (!incoming) {
        console.log(`Skipping ${action.incoming.id} — row no longer exists (likely fixed by prior repair)`);
        continue;
      }

      const freshInput = toUpsertInput(incoming);
      console.log(`Applying repair for: ${hotelName} (${formatDisplayDate(freshInput.startDate)} – ${formatDisplayDate(freshInput.endDate)})`);

      try {
        await prisma.$transaction(
          async (tx) => {
            await upsertPricingWithSplit(tx, freshInput, { excludeId: incoming.id });
          },
          { maxWait: 15000, timeout: 60000 }
        );
        applied += 1;
        console.log("  OK");
      } catch (err) {
        failed += 1;
        console.error(`  FAILED:`, err.message || err);
      }
    }
  } else if (!apply && actions.length > 0) {
    console.log("Re-run with --apply to persist repairs.");
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Active pricing rows scanned: ${pricingRows.length}`);
  console.log(`Hotels scanned: ${hotelsScanned}`);
  console.log(`Hotels with overlaps: ${hotelsWithOverlaps}`);
  console.log(`Overlap pairs: ${pairs.length}`);
  console.log(`Repair actions planned: ${actions.length}`);
  console.log(`Skipped (Seasonal vs Seasonal): ${skipped.seasonalVsSeasonal.length}`);
  console.log(`Skipped (idempotent): ${skipped.idempotent.length}`);
  if (apply) {
    console.log(`Applied: ${applied}`);
    console.log(`Failed: ${failed}`);
  }
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
