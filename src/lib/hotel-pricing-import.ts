import * as XLSX from "xlsx";
import { format as formatDate, isValid, parse as parseWithFormat, parseISO } from "date-fns";

export interface HotelPricingImportRow {
  rowNumber: number;
  hotelId?: string;
  hotelName?: string;
  locationName?: string;
  roomTypeName: string;
  occupancyTypeName: string;
  mealPlanCode?: string | null;
  startDate: string;
  endDate: string;
  price: number;
  isActive: boolean;
  currency?: string | null;
  notes?: string | null;
}

export interface HotelPricingParseError {
  rowNumber: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface HotelPricingParseResult {
  rows: HotelPricingImportRow[];
  errors: HotelPricingParseError[];
  warnings: string[];
  stats: {
    sheetName: string;
    totalRows: number;
    dataRows: number;
    skippedEmptyRows: number;
    fileName?: string;
  };
}

export function dateRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA <= endB && endA >= startB;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  hotel_id: ["hotel_id", "hotelid", "hotel_code", "hotel"],
  hotel_name: ["hotel_name", "hotelname", "name"],
  location_name: ["location_name", "location", "destination"],
  room_type_name: ["room_type_name", "roomtype", "room_type", "room"],
  occupancy_type_name: ["occupancy_type_name", "occupancy", "occupancy_type", "pax"],
  meal_plan_code: ["meal_plan_code", "mealplan", "meal_plan", "plan"],
  start_date: ["start_date", "from", "from_date", "start"],
  end_date: ["end_date", "to", "to_date", "end"],
  price_per_night: ["price_per_night", "price", "rate", "amount"],
  currency: ["currency"],
  is_active: ["is_active", "active", "status"],
  notes: ["notes", "note", "remarks", "comment"],
};

const REQUIRED_COLUMNS: Array<keyof typeof COLUMN_ALIASES> = [
  "hotel_id",
  "room_type_name",
  "occupancy_type_name",
  "start_date",
  "end_date",
  "price_per_night",
];

const FLEXIBLE_DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
  "dd.MM.yyyy",
  "MM.dd.yyyy",
];

type HeaderIndexMap = Record<keyof typeof COLUMN_ALIASES, number | undefined>;

function normalizeHeader(label: unknown): string {
  if (label === null || label === undefined) {
    return "";
  }
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function coerceString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }
  if (value instanceof Date && isValid(value)) {
    return formatDate(value, "yyyy-MM-dd");
  }
  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[ ,]/g, "").trim();
    if (!cleaned) {
      return undefined;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    if (["true", "t", "yes", "y", "1", "active", "enabled"].includes(normalized)) {
      return true;
    }
    if (["false", "f", "no", "n", "0", "inactive", "disabled"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function coerceDate(value: unknown): string | undefined {
  if (value instanceof Date && isValid(value)) {
    return formatDate(value, "yyyy-MM-dd");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const decoded = XLSX.SSF.parse_date_code(value);
    if (decoded && decoded.y && decoded.m && decoded.d) {
      const date = new Date(Date.UTC(decoded.y, decoded.m - 1, decoded.d));
      if (isValid(date)) {
        return formatDate(date, "yyyy-MM-dd");
      }
    }
  }
  const stringValue = coerceString(value);
  if (!stringValue) {
    return undefined;
  }
  const isoCandidate = parseISO(stringValue);
  if (isValid(isoCandidate)) {
    return formatDate(isoCandidate, "yyyy-MM-dd");
  }
  if (/^\d+$/.test(stringValue)) {
    const numeric = Number(stringValue);
    const decoded = XLSX.SSF.parse_date_code(numeric);
    if (decoded && decoded.y && decoded.m && decoded.d) {
      const date = new Date(Date.UTC(decoded.y, decoded.m - 1, decoded.d));
      if (isValid(date)) {
        return formatDate(date, "yyyy-MM-dd");
      }
    }
  }
  for (const formatPattern of FLEXIBLE_DATE_FORMATS) {
    const parsed = parseWithFormat(stringValue, formatPattern, new Date());
    if (isValid(parsed)) {
      return formatDate(parsed, "yyyy-MM-dd");
    }
  }
  return undefined;
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => {
    if (cell === null || cell === undefined) return true;
    if (typeof cell === "string" && cell.trim() === "") return true;
    return false;
  });
}

function resolveHeaderIndexes(headers: string[]): HeaderIndexMap {
  const indexMap = {} as HeaderIndexMap;
  (Object.keys(COLUMN_ALIASES) as Array<keyof typeof COLUMN_ALIASES>).forEach((key) => {
    const aliases = COLUMN_ALIASES[key];
    const match = aliases.map(normalizeHeader).find((alias) => headers.includes(alias));
    if (match) {
      indexMap[key] = headers.indexOf(match);
    }
  });
  return indexMap;
}

function pickCell(row: unknown[], index: number | undefined): unknown {
  if (typeof index !== "number") return undefined;
  return row[index];
}

export function parseHotelPricingWorkbook(buffer: Buffer, options?: { fileName?: string }): HotelPricingParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!workbook.SheetNames.length) {
    throw new Error("No worksheets found in uploaded file");
  }

  const preferredSheet = workbook.SheetNames.find(
    (name) => name.toLowerCase() === "uploadtemplate"
  );
  const sheetName = preferredSheet ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Unable to locate worksheet data");
  }

  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  if (!table.length) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: "Worksheet is empty",
        },
      ],
      warnings: [],
      stats: {
        sheetName,
        totalRows: 0,
        dataRows: 0,
        skippedEmptyRows: 0,
        fileName: options?.fileName,
      },
    };
  }

  const headerRow = table[0] ?? [];
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const headerIndexes = resolveHeaderIndexes(normalizedHeaders);

  const missingColumns = REQUIRED_COLUMNS.filter((column) => headerIndexes[column] === undefined);
  if (missingColumns.length) {
    return {
      rows: [],
      errors: missingColumns.map((column) => ({
        rowNumber: 1,
        field: column,
        message: `Missing required column \"${column}\" in template`,
      })),
      warnings: [],
      stats: {
        sheetName,
        totalRows: 0,
        dataRows: 0,
        skippedEmptyRows: 0,
        fileName: options?.fileName,
      },
    };
  }

  const rows: HotelPricingImportRow[] = [];
  const errors: HotelPricingParseError[] = [];
  const warnings: string[] = [];
  let dataRows = 0;
  let skippedEmptyRows = 0;

  for (let i = 1; i < table.length; i++) {
    const rawRow = table[i] ?? [];
    const rowNumber = i + 1;

    if (isEmptyRow(rawRow)) {
      skippedEmptyRows += 1;
      continue;
    }

    dataRows += 1;
    const rowErrors: HotelPricingParseError[] = [];

    const hotelId = coerceString(pickCell(rawRow, headerIndexes.hotel_id));
    const hotelName = coerceString(pickCell(rawRow, headerIndexes.hotel_name));
    const locationName = coerceString(pickCell(rawRow, headerIndexes.location_name));
    const roomTypeName = coerceString(pickCell(rawRow, headerIndexes.room_type_name));
    const occupancyTypeName = coerceString(pickCell(rawRow, headerIndexes.occupancy_type_name));
    const mealPlanCodeRaw = coerceString(pickCell(rawRow, headerIndexes.meal_plan_code));
    const startDate = coerceDate(pickCell(rawRow, headerIndexes.start_date));
    const endDate = coerceDate(pickCell(rawRow, headerIndexes.end_date));
    const price = coerceNumber(pickCell(rawRow, headerIndexes.price_per_night));
    const currency = coerceString(pickCell(rawRow, headerIndexes.currency));
    const isActiveRaw = coerceBoolean(pickCell(rawRow, headerIndexes.is_active));
    const notes = coerceString(pickCell(rawRow, headerIndexes.notes));

    if (!hotelId && !hotelName) {
      rowErrors.push({ rowNumber, field: "hotel_id", message: "Hotel ID is required", value: hotelId ?? hotelName });
    }
    if (!roomTypeName) {
      rowErrors.push({ rowNumber, field: "room_type_name", message: "Room type is required" });
    }
    if (!occupancyTypeName) {
      rowErrors.push({ rowNumber, field: "occupancy_type_name", message: "Occupancy type is required" });
    }
    if (!startDate) {
      rowErrors.push({ rowNumber, field: "start_date", message: "Start date is invalid or missing" });
    }
    if (!endDate) {
      rowErrors.push({ rowNumber, field: "end_date", message: "End date is invalid or missing" });
    }
    if (startDate && endDate && startDate > endDate) {
      rowErrors.push({ rowNumber, field: "start_date", message: "Start date must be on or before end date" });
    }
    if (price === undefined || Number.isNaN(price)) {
      rowErrors.push({ rowNumber, field: "price_per_night", message: "Price must be a valid number" });
    } else if (price < 0) {
      rowErrors.push({ rowNumber, field: "price_per_night", message: "Price cannot be negative", value: price });
    }

    if (currency && currency.toUpperCase() !== "INR") {
      warnings.push(`Row ${rowNumber}: Currency \"${currency}\" detected and ignored (pricing stored in INR)`);
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      rowNumber,
      hotelId: hotelId?.trim(),
      hotelName: hotelName?.trim(),
      locationName: locationName?.trim(),
      roomTypeName: roomTypeName!.trim(),
      occupancyTypeName: occupancyTypeName!.trim(),
      mealPlanCode: mealPlanCodeRaw?.trim() ?? null,
      startDate: startDate!,
      endDate: endDate!,
      price: price!,
      isActive: isActiveRaw ?? true,
      currency: currency?.trim() ?? null,
      notes: notes ?? null,
    });
  }

  return {
    rows,
    errors,
    warnings,
    stats: {
      sheetName,
      totalRows: Math.max(table.length - 1, 0),
      dataRows,
      skippedEmptyRows,
      fileName: options?.fileName,
    },
  };
}
