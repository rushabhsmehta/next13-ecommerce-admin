#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const { PrismaClient } = require("@prisma/client");
const ExcelJS = require("exceljs");

const prisma = new PrismaClient();

const BRAND = {
  rose: "FFC23A5E",
  magenta: "FF9B3A8D",
  cream: "FFFFF9F5",
  creamZebra: "FFF5EDE8",
  white: "FFFFFFFF",
  darkText: "FF2D2D2D",
  mutedText: "FF666666",
};

const DEFAULT_ORG = {
  name: "Aagam Holidays",
  address: "",
  phone: "",
  email: "",
  website: "https://www.aagamholidays.com",
  gstNumber: "",
  panNumber: "",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatReportDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
  const MS = 86400000;
  return Math.floor((endMs - startMs) / MS) + 1;
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

function fillSolid(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function font(bold, size, colorArgb) {
  return { bold: !!bold, size: size || 11, color: { argb: colorArgb || BRAND.darkText } };
}

function thinBorder() {
  const c = { argb: "FFE0D6D0" };
  return {
    top: { style: "thin", color: c },
    left: { style: "thin", color: c },
    bottom: { style: "thin", color: c },
    right: { style: "thin", color: c },
  };
}

function setCell(ws, row, col, value, style) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  if (style) Object.assign(cell, style);
  return cell;
}

function mergeTitleRow(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = font(true, 16, BRAND.white);
  cell.fill = fillSolid(BRAND.rose);
  cell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(row).height = 28;
}

function addOrgBlock(ws, org, startRow, colEnd) {
  let r = startRow;
  const lines = [
    org.name,
    org.address || "",
    [org.phone && `Phone: ${org.phone}`, org.email && `Email: ${org.email}`].filter(Boolean).join("  |  "),
    [org.website && `Website: ${org.website}`, org.gstNumber && `GST: ${org.gstNumber}`, org.panNumber && `PAN: ${org.panNumber}`]
      .filter(Boolean)
      .join("  |  "),
  ].filter((line) => line && line.trim());

  for (const line of lines) {
    ws.mergeCells(r, 1, r, colEnd);
    const cell = ws.getCell(r, 1);
    cell.value = line;
    cell.font = r === startRow ? font(true, 14, BRAND.rose.replace("FF", "FF").slice(2) ? "FFC23A5E" : "FFC23A5E") : font(false, 10, BRAND.mutedText);
    if (r === startRow) {
      cell.font = font(true, 14, "FFC23A5E");
    } else {
      cell.font = font(false, 10, BRAND.mutedText);
    }
    cell.fill = fillSolid(BRAND.cream);
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    r++;
  }
  return r;
}

function styleHeaderRow(ws, rowNum, colCount) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = font(true, 11, BRAND.white);
    cell.fill = fillSolid(BRAND.magenta);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder();
  }
}

function applyZebra(ws, startRow, endRow, colCount) {
  for (let r = startRow; r <= endRow; r++) {
    const zebra = (r - startRow) % 2 === 1;
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getCell(r, c);
      if (!cell.fill || !cell.fill.fgColor) {
        cell.fill = fillSolid(zebra ? BRAND.creamZebra : BRAND.white);
      }
      cell.border = thinBorder();
      cell.alignment = { vertical: "top", wrapText: true };
    }
  }
}

function rowSnapshot(row) {
  return {
    id: row.id,
    hotelId: row.hotelId,
    hotelName: row.hotel?.name || "",
    locationName: row.hotel?.location?.label || "",
    roomType: row.roomType?.name || "(any)",
    occupancy: row.occupancyType?.name || "(any)",
    mealPlan: row.mealPlan?.name || "(any)",
    startDate: row.startDate,
    endDate: row.endDate,
    price: row.price,
    kind: pricingKind(row),
    seasonalName: row.locationSeasonalPeriod?.name || "",
    seasonalType: row.locationSeasonalPeriod?.seasonType || "",
    locationSeasonalPeriodId: row.locationSeasonalPeriodId,
  };
}

async function loadData() {
  const [org, pricingRows] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.hotelPricing.findMany({
      where: { isActive: true },
      include: {
        hotel: { include: { location: { select: { label: true } } } },
        roomType: { select: { name: true } },
        occupancyType: { select: { name: true } },
        mealPlan: { select: { name: true } },
        locationSeasonalPeriod: { select: { name: true, seasonType: true } },
      },
      orderBy: [{ hotelId: "asc" }, { startDate: "asc" }],
    }),
  ]);

  const organization = org
    ? {
        name: org.name,
        address: [org.address, org.city, org.state, org.pincode, org.country].filter(Boolean).join(", "),
        phone: org.phone || "",
        email: org.email || "",
        website: org.website || DEFAULT_ORG.website,
        gstNumber: org.gstNumber || "",
        panNumber: org.panNumber || "",
      }
    : DEFAULT_ORG;

  const groups = new Map();
  for (const row of pricingRows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const overlapPairs = [];
  for (const [, items] of groups) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (!rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) continue;
        const ov = overlapRange(a.startDate, a.endDate, b.startDate, b.endDate);
        overlapPairs.push({
          classification: classifyPair(a, b),
          overlapDays: ov.days,
          overlapStart: new Date(ov.startMs),
          overlapEnd: new Date(ov.endMs),
          rowA: rowSnapshot(a),
          rowB: rowSnapshot(b),
          groupKey: groupKey(a),
        });
      }
    }
  }

  overlapPairs.sort((x, y) => {
    const h = x.rowA.hotelName.localeCompare(y.rowA.hotelName);
    if (h !== 0) return h;
    return y.overlapDays - x.overlapDays;
  });

  const rowIds = new Set();
  for (const p of overlapPairs) {
    rowIds.add(p.rowA.id);
    rowIds.add(p.rowB.id);
  }

  const hotelsAffected = new Set(overlapPairs.map((p) => p.rowA.hotelId));

  const patternCounts = {
    "Manual vs Manual": 0,
    "Manual vs Seasonal": 0,
    "Seasonal vs Seasonal": 0,
  };
  for (const p of overlapPairs) {
    patternCounts[p.classification] = (patternCounts[p.classification] || 0) + 1;
  }

  const hotelStats = new Map();
  for (const p of overlapPairs) {
    const id = p.rowA.hotelId;
    if (!hotelStats.has(id)) {
      hotelStats.set(id, {
        hotelId: id,
        hotelName: p.rowA.hotelName,
        locationName: p.rowA.locationName,
        pairCount: 0,
        totalOverlapDays: 0,
        example: p,
        patterns: new Set(),
      });
    }
    const s = hotelStats.get(id);
    s.pairCount++;
    s.totalOverlapDays += p.overlapDays;
    s.patterns.add(p.classification);
    if (!s.example || p.overlapDays > s.example.overlapDays) s.example = p;
  }

  const hotelRanking = [...hotelStats.values()].sort((a, b) => b.pairCount - a.pairCount || b.totalOverlapDays - a.totalOverlapDays);

  const rowsInvolved = pricingRows
    .filter((r) => rowIds.has(r.id))
    .map(rowSnapshot)
    .sort((a, b) => a.hotelName.localeCompare(b.hotelName) || a.startDate - b.startDate);

  return {
    organization,
    pricingRows,
    overlapPairs,
    hotelsAffected,
    patternCounts,
    hotelRanking,
    rowsInvolved,
  };
}

function suggestedFix(example) {
  if (!example) return "Review overlapping active rows for this hotel.";
  const { classification, rowA, rowB } = example;
  if (classification === "Manual vs Manual") {
    return "Deactivate or shorten one manual row, or merge into a single date range with one price.";
  }
  if (classification === "Manual vs Seasonal") {
    return "Align manual block dates with seasonal periods, or deactivate the redundant manual row.";
  }
  return "Ensure seasonal periods for the same room/meal do not overlap; adjust period dates or deactivate one row.";
}

async function buildWorkbook(data, generatedAt) {
  const wb = new ExcelJS.Workbook();
  wb.creator = data.organization.name;
  wb.created = generatedAt;

  const { organization, pricingRows, overlapPairs, hotelsAffected, patternCounts, hotelRanking, rowsInvolved } = data;

  // --- Sheet 1: Executive Summary ---
  const sum = wb.addWorksheet("Executive Summary", {
    views: [{ state: "frozen", ySplit: 0 }],
    properties: { defaultRowHeight: 18 },
  });
  sum.columns = [
    { width: 32 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  mergeTitleRow(sum, 1, 1, 6, "Hotel Pricing Overlap Audit");
  let sr = addOrgBlock(sum, organization, 2, 6) + 1;
  sum.mergeCells(sr, 1, sr, 6);
  sum.getCell(sr, 1).value = `Generated: ${formatDisplayDate(generatedAt)} ${pad2(generatedAt.getHours())}:${pad2(generatedAt.getMinutes())}`;
  sum.getCell(sr, 1).font = font(false, 10, BRAND.mutedText);
  sr += 2;

  const metrics = [
    ["Metric", "Value"],
    ["Active hotel pricing rows", pricingRows.length],
    ["Overlap pairs detected", overlapPairs.length],
    ["Distinct pricing rows in overlaps", rowsInvolved.length],
    ["Hotels affected", hotelsAffected.size],
  ];
  sum.getCell(sr, 1).value = "Key metrics";
  sum.getCell(sr, 1).font = font(true, 12, "FFC23A5E");
  sr++;
  const metricHeader = sr;
  metrics.forEach((row, idx) => {
    if (idx === 0) return;
    sum.getCell(sr, 1).value = row[0];
    sum.getCell(sr, 2).value = row[1];
    sr++;
  });
  styleHeaderRow(sum, metricHeader, 2);
  applyZebra(sum, metricHeader + 1, sr - 1, 2);
  sr += 2;

  sum.getCell(sr, 1).value = "Overlap pattern breakdown";
  sum.getCell(sr, 1).font = font(true, 12, "FFC23A5E");
  sr++;
  const patHeader = sr;
  sum.getCell(sr, 1).value = "Pattern";
  sum.getCell(sr, 2).value = "Count";
  sr++;
  for (const [pat, count] of Object.entries(patternCounts)) {
    sum.getCell(sr, 1).value = pat;
    sum.getCell(sr, 2).value = count;
    sr++;
  }
  styleHeaderRow(sum, patHeader, 2);
  applyZebra(sum, patHeader + 1, sr - 1, 2);
  sr += 2;

  sum.getCell(sr, 1).value = "Hotels ranked by overlap pairs";
  sum.getCell(sr, 1).font = font(true, 12, "FFC23A5E");
  sr++;
  const rankHeader = sr;
  const rankCols = ["Rank", "Hotel", "Location", "Overlap pairs", "Total overlap days", "Patterns"];
  rankCols.forEach((h, i) => {
    sum.getCell(sr, i + 1).value = h;
  });
  sr++;
  hotelRanking.forEach((h, idx) => {
    sum.getCell(sr, 1).value = idx + 1;
    sum.getCell(sr, 2).value = h.hotelName;
    sum.getCell(sr, 3).value = h.locationName;
    sum.getCell(sr, 4).value = h.pairCount;
    sum.getCell(sr, 5).value = h.totalOverlapDays;
    sum.getCell(sr, 6).value = [...h.patterns].join(", ");
    sr++;
  });
  styleHeaderRow(sum, rankHeader, 6);
  if (sr > rankHeader + 1) applyZebra(sum, rankHeader + 1, sr - 1, 6);

  // --- Sheet 2: All Overlaps ---
  const all = wb.addWorksheet("All Overlaps");
  const allHeaders = [
    "Classification",
    "Overlap days",
    "Overlap from",
    "Overlap to",
    "Hotel",
    "Location",
    "Room type",
    "Occupancy",
    "Meal plan",
    "Row A ID",
    "Row A kind",
    "Row A dates",
    "Row A price",
    "Row A seasonal",
    "Row B ID",
    "Row B kind",
    "Row B dates",
    "Row B price",
    "Row B seasonal",
  ];
  all.columns = allHeaders.map((h) => ({ width: Math.min(28, Math.max(12, h.length + 2)) }));
  mergeTitleRow(all, 1, 1, allHeaders.length, "All overlap pairs");
  allHeaders.forEach((h, i) => {
    all.getCell(3, i + 1).value = h;
  });
  styleHeaderRow(all, 3, allHeaders.length);
  let ar = 4;
  for (const p of overlapPairs) {
    const c = 1;
    all.getRow(ar).values = [
      p.classification,
      p.overlapDays,
      formatDisplayDate(p.overlapStart),
      formatDisplayDate(p.overlapEnd),
      p.rowA.hotelName,
      p.rowA.locationName,
      p.rowA.roomType,
      p.rowA.occupancy,
      p.rowA.mealPlan,
      p.rowA.id,
      p.rowA.kind,
      `${formatDisplayDate(p.rowA.startDate)} – ${formatDisplayDate(p.rowA.endDate)}`,
      p.rowA.price,
      p.rowA.seasonalName || "—",
      p.rowB.id,
      p.rowB.kind,
      `${formatDisplayDate(p.rowB.startDate)} – ${formatDisplayDate(p.rowB.endDate)}`,
      p.rowB.price,
      p.rowB.seasonalName || "—",
    ];
    all.getCell(ar, 13).numFmt = '#,##0.00';
    all.getCell(ar, 18).numFmt = '#,##0.00';
    ar++;
  }
  if (ar > 4) applyZebra(all, 4, ar - 1, allHeaders.length);
  all.views = [{ state: "frozen", ySplit: 3, xSplit: 0 }];

  // --- Sheet 3: By Hotel ---
  const byHotel = wb.addWorksheet("By Hotel");
  const bhHeaders = [
    "Hotel",
    "Location",
    "Overlap pairs",
    "Total overlap days",
    "Patterns seen",
    "Example overlap (days)",
    "Example classification",
    "Example room / occupancy / meal",
    "Suggested fix",
  ];
  byHotel.columns = bhHeaders.map((h) => ({ width: Math.min(36, Math.max(14, h.length + 2)) }));
  mergeTitleRow(byHotel, 1, 1, bhHeaders.length, "Overlaps by hotel");
  bhHeaders.forEach((h, i) => byHotel.getCell(3, i + 1).value = h);
  styleHeaderRow(byHotel, 3, bhHeaders.length);
  let br = 4;
  for (const h of hotelRanking) {
    const ex = h.example;
    byHotel.getRow(br).values = [
      h.hotelName,
      h.locationName,
      h.pairCount,
      h.totalOverlapDays,
      [...h.patterns].join(", "),
      ex ? ex.overlapDays : "",
      ex ? ex.classification : "",
      ex ? `${ex.rowA.roomType} / ${ex.rowA.occupancy} / ${ex.rowA.mealPlan}` : "",
      suggestedFix(ex),
    ];
    br++;
  }
  if (br > 4) applyZebra(byHotel, 4, br - 1, bhHeaders.length);
  byHotel.views = [{ state: "frozen", ySplit: 3 }];

  // --- Sheet 4: Rows Involved ---
  const rowsSheet = wb.addWorksheet("Rows Involved");
  const riHeaders = [
    "Pricing row ID",
    "Hotel",
    "Location",
    "Room type",
    "Occupancy",
    "Meal plan",
    "Start date",
    "End date",
    "Price (INR)",
    "Kind",
    "Seasonal period",
    "Season type",
  ];
  rowsSheet.columns = riHeaders.map((h) => ({ width: 16 }));
  mergeTitleRow(rowsSheet, 1, 1, riHeaders.length, "Pricing rows participating in overlaps");
  riHeaders.forEach((h, i) => rowsSheet.getCell(3, i + 1).value = h);
  styleHeaderRow(rowsSheet, 3, riHeaders.length);
  let rr = 4;
  for (const r of rowsInvolved) {
    rowsSheet.getRow(rr).values = [
      r.id,
      r.hotelName,
      r.locationName,
      r.roomType,
      r.occupancy,
      r.mealPlan,
      formatDisplayDate(r.startDate),
      formatDisplayDate(r.endDate),
      r.price,
      r.kind,
      r.seasonalName || "—",
      r.seasonalType || "—",
    ];
    rowsSheet.getCell(rr, 9).numFmt = '#,##0.00';
    rr++;
  }
  if (rr > 4) applyZebra(rowsSheet, 4, rr - 1, riHeaders.length);
  rowsSheet.views = [{ state: "frozen", ySplit: 3 }];

  // --- Sheet 5: How to read ---
  const guide = wb.addWorksheet("How to read");
  guide.columns = [{ width: 22 }, { width: 70 }];
  mergeTitleRow(guide, 1, 1, 2, "How to read this report");
  const guideRows = [
    ["Purpose", "Identifies active hotel pricing records whose date ranges overlap for the same hotel, room type, occupancy, and meal plan combination."],
    ["Scope", "Only rows with isActive = true are included. Overlaps are computed within each grouping key (hotel + room + occupancy + meal)."],
    ["Date logic", "Ranges overlap when startA ≤ endB and startB ≤ endA (inclusive calendar days, UTC date components)."],
    ["Manual pricing", "Rows without a linked locationSeasonalPeriodId are treated as manual date blocks."],
    ["Seasonal pricing", "Rows linked to a location seasonal period are classified as seasonal."],
    ["Classifications", "Manual vs Manual, Manual vs Seasonal, and Seasonal vs Seasonal describe the pair types in each overlap."],
    ["Overlap days", "Inclusive count of calendar days in the intersection of both ranges."],
    ["Suggested fixes", "On By Hotel: deactivate redundant rows, narrow dates, or align manual blocks with seasonal calendars."],
    ["IDs", "Use Pricing row ID values to locate records in the admin hotel pricing UI or database."],
  ];
  let gr = 3;
  guide.getCell(gr, 1).value = "Topic";
  guide.getCell(gr, 2).value = "Description";
  styleHeaderRow(guide, gr, 2);
  gr++;
  for (const [topic, desc] of guideRows) {
    guide.getCell(gr, 1).value = topic;
    guide.getCell(gr, 2).value = desc;
    gr++;
  }
  applyZebra(guide, 4, gr - 1, 2);
  guide.views = [{ state: "frozen", ySplit: 3 }];

  return wb;
}

async function main() {
  const generatedAt = new Date();
  const dateStamp = formatReportDate(generatedAt);
  const outFile = path.join(__dirname, `hotel-pricing-overlap-report-${dateStamp}.xlsx`);
  const absOut = path.resolve(outFile);

  const data = await loadData();
  const wb = await buildWorkbook(data, generatedAt);
  await wb.xlsx.writeFile(absOut);

  const stats = {
    totalActiveRows: data.pricingRows.length,
    overlapPairs: data.overlapPairs.length,
    hotelsAffected: data.hotelsAffected.size,
    rowsInvolved: data.rowsInvolved.length,
    outputPath: absOut,
  };

  console.log(JSON.stringify(stats, null, 2));
  console.log(absOut);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
