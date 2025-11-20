#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const DEFAULT_ROW_TARGET = 400;
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  "docs/templates/hotel-pricing-upload-template.xlsx"
);

function parseArgs() {
  const args = process.argv.slice(2);
  const options: { out?: string; rows?: number } = {};
  args.forEach((arg) => {
    if (arg.startsWith("--out=")) {
      options.out = path.resolve(process.cwd(), arg.split("=")[1]);
    }
    if (arg.startsWith("--rows=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) {
        options.rows = value;
      }
    }
  });
  return options;
}

async function fetchLookups() {
  const [hotels, roomTypes, occupancyTypes, mealPlans] = await Promise.all([
    prisma.hotel.findMany({
      select: {
        id: true,
        name: true,
        location: {
          select: {
            label: true,
          },
        },
      },
      orderBy: [
        { location: { label: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.roomType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.occupancyType.findMany({
      where: { isActive: true },
      orderBy: [{ rank: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.mealPlan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  return {
    hotels,
    roomTypes,
    occupancyTypes,
    mealPlans,
  };
}

function buildLookupsSheet({
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
}: Awaited<ReturnType<typeof fetchLookups>>) {
  const sheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(
    sheet,
    [["hotel_id", "hotel_name", "location_name", "hotel_display"]],
    { origin: "A1" }
  );

  hotels.forEach((hotel, index) => {
    const locationLabel = hotel.location?.label ?? "";
    const displayName = locationLabel
      ? `${hotel.name} (${locationLabel})`
      : hotel.name;
    XLSX.utils.sheet_add_aoa(
      sheet,
      [[hotel.id, hotel.name, locationLabel, displayName]],
      { origin: { r: index + 1, c: 0 } }
    );
  });

  XLSX.utils.sheet_add_aoa(sheet, [["room_type_name"]], { origin: "F1" });
  roomTypes.forEach((type, index) => {
    XLSX.utils.sheet_add_aoa(sheet, [[type.name]], {
      origin: { r: index + 1, c: 5 },
    });
  });

  XLSX.utils.sheet_add_aoa(sheet, [["occupancy_type_name"]], { origin: "G1" });
  occupancyTypes.forEach((type, index) => {
    XLSX.utils.sheet_add_aoa(sheet, [[type.name]], {
      origin: { r: index + 1, c: 6 },
    });
  });

  XLSX.utils.sheet_add_aoa(sheet, [["meal_plan_code", "meal_plan_name"]], {
    origin: "H1",
  });
  mealPlans.forEach((plan, index) => {
    XLSX.utils.sheet_add_aoa(sheet, [[plan.code, plan.name]], {
      origin: { r: index + 1, c: 7 },
    });
  });

  const currencies = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];
  XLSX.utils.sheet_add_aoa(sheet, [["currency"]], { origin: "J1" });
  currencies.forEach((currency, index) => {
    XLSX.utils.sheet_add_aoa(sheet, [[currency]], {
      origin: { r: index + 1, c: 9 },
    });
  });

  XLSX.utils.sheet_add_aoa(sheet, [["boolean_flag"]], { origin: "K1" });
  ["TRUE", "FALSE"].forEach((value, index) => {
    XLSX.utils.sheet_add_aoa(sheet, [[value]], {
      origin: { r: index + 1, c: 10 },
    });
  });

  sheet["!ref"] = "A1:K" + String(
    Math.max(
      hotels.length + 1,
      roomTypes.length + 1,
      occupancyTypes.length + 1,
      mealPlans.length + 1,
      currencies.length + 1,
      3
    )
  );

  return sheet;
}

function buildTemplateSheet(
  lookups: Awaited<ReturnType<typeof fetchLookups>>,
  rowTarget: number
) {
  const baseHeader = [
    "hotel_id",
    "hotel_name",
    "location_name",
    "room_type_name",
    "meal_plan_code",
    "start_date",
    "end_date",
    "currency",
    "is_active",
    "notes",
  ];

  const occupancyHeaders = lookups.occupancyTypes.map((type) => type.name);
  const header = [...baseHeader, ...occupancyHeaders];

  const rows: string[][] = [header];
  const blankRow = new Array(header.length).fill("") as string[];
  for (let i = 0; i < rowTarget; i++) {
    rows.push([...blankRow]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const totalRows = rows.length;

  // Auto-populate hotel name and location based on hotel_id
  for (let r = 2; r <= totalRows; r++) {
    sheet[`B${r}`] = {
      t: "s",
      f: `IF($A${r}="","",INDEX(Lookups!$B$2:$B$${lookups.hotels.length + 1},MATCH($A${r},Lookups!$A$2:$A$${lookups.hotels.length + 1},0)))`,
    };
    sheet[`C${r}`] = {
      t: "s",
      f: `IF($A${r}="","",INDEX(Lookups!$C$2:$C$${lookups.hotels.length + 1},MATCH($A${r},Lookups!$A$2:$A$${lookups.hotels.length + 1},0)))`,
    };
  }

  const lastColumnLetter = XLSX.utils.encode_col(header.length - 1);
  sheet["!ref"] = `A1:${lastColumnLetter}${totalRows}`;

  const columnWidths = [
    { wch: 40 },
    { wch: 32 },
    { wch: 28 },
    { wch: 28 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 40 },
  ];
  for (let i = 0; i < occupancyHeaders.length; i++) {
    columnWidths.push({ wch: 18 });
  }
  sheet["!cols"] = columnWidths;

  const lastRow = totalRows;
  const dataValidation = [
    {
      sqref: `A2:A${lastRow}`,
      type: "list" as const,
      allowBlank: true,
      formulas: [`Lookups!$A$2:$A$${lookups.hotels.length + 1}`],
      showErrorMessage: true,
      error: "Select a hotel ID from the predefined list",
    },
    {
      sqref: `D2:D${lastRow}`,
      type: "list" as const,
      allowBlank: true,
      formulas: [`Lookups!$F$2:$F$${lookups.roomTypes.length + 1}`],
    },
    {
      sqref: `E2:E${lastRow}`,
      type: "list" as const,
      allowBlank: true,
      formulas: [`Lookups!$H$2:$H$${lookups.mealPlans.length + 1}`],
    },
    {
      sqref: `H2:H${lastRow}`,
      type: "list" as const,
      allowBlank: true,
      formulas: ["Lookups!$J$2:$J$7"],
    },
    {
      sqref: `I2:I${lastRow}`,
      type: "list" as const,
      allowBlank: true,
      formulas: ["Lookups!$K$2:$K$3"],
    },
  ];

  (sheet as XLSX.WorkSheet & { "!dataValidation"?: typeof dataValidation })["!dataValidation"] =
    dataValidation;

  return sheet;
}

async function main() {
  const { out, rows } = parseArgs();
  const outputPath = out ?? DEFAULT_OUTPUT;
  const rowTarget = rows ?? DEFAULT_ROW_TARGET;

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  const lookups = await fetchLookups();
  if (lookups.hotels.length === 0) {
    throw new Error("No hotels found in the database. Cannot build template.");
  }

  const workbook = XLSX.utils.book_new();
  const templateSheet = buildTemplateSheet(lookups, rowTarget);
  const lookupsSheet = buildLookupsSheet(lookups);

  XLSX.utils.book_append_sheet(workbook, templateSheet, "UploadTemplate");
  XLSX.utils.book_append_sheet(workbook, lookupsSheet, "Lookups");

  workbook.Workbook = workbook.Workbook ?? {};
  workbook.Workbook.Sheets = workbook.SheetNames.map((name) => ({
    name,
    Hidden: name === "Lookups" ? 1 : 0,
  }));

  XLSX.writeFile(workbook, outputPath, { compression: true });

  console.log(`✅ Hotel pricing template written to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error("❌ Failed to build hotel pricing template:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
