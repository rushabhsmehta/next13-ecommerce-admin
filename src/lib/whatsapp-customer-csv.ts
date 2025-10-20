import { parse } from "csv-parse/sync";
import type { WhatsAppCustomerInput } from "./whatsapp-customers";
import { normalizeWhatsAppPhone } from "./whatsapp-customers";

const REQUIRED_HEADERS = ["first name", "mobile number"] as const;

export type WhatsAppCustomerCsvParseOptions = {
  sourceName?: string;
  defaultTags?: string[];
};

export type WhatsAppCustomerCsvDuplicate = {
  phoneNumber: string;
  occurrences: Array<{ rowNumber: number; name: string }>;
};

export type WhatsAppCustomerCsvParseResult = {
  customers: WhatsAppCustomerInput[];
  totalRows: number;
  uniquePhones: number;
  duplicates: WhatsAppCustomerCsvDuplicate[];
};

function sanitizeHeader(header: string) {
  return header.replace(/\uFEFF/g, "").trim().toLowerCase();
}

function cleanValue(value: string | undefined | null) {
  if (typeof value !== "string") {
    return undefined;
  }
  const stripped = value
    .replace(/\u00A0/g, " ") // Non-breaking space
    .replace(/\r/g, "")
    .replace(/\t/g, "")
    .trim();
  return stripped.length ? stripped : undefined;
}

function splitTags(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }
  const values = raw
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return values.length ? values : undefined;
}

function mergeTags(rowTags: string[] | undefined, defaults: string[] | undefined) {
  const combined = new Set<string>();
  (defaults ?? []).forEach((tag) => {
    const trimmed = tag.trim();
    if (trimmed) {
      combined.add(trimmed);
    }
  });
  (rowTags ?? []).forEach((tag) => {
    const trimmed = tag.trim();
    if (trimmed) {
      combined.add(trimmed);
    }
  });
  return combined.size ? Array.from(combined) : undefined;
}

export function parseWhatsAppCustomerCsv(
  csvText: string,
  options: WhatsAppCustomerCsvParseOptions = {}
): WhatsAppCustomerCsvParseResult {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error("Uploaded file is empty");
  }

  const records = parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string | undefined>[];

  if (!records.length) {
    throw new Error("No customer rows found in CSV");
  }

  const normalizedHeaders = Object.keys(records[0]).map(sanitizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.includes(header));
  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
  }

  const customerInputs: WhatsAppCustomerInput[] = [];
  const occurrences = new Map<string, Array<{ rowNumber: number; name: string }>>();

  records.forEach((record, index) => {
    const rowNumber = index + 2; // account for header row

    const get = (key: string) => {
      const entry = Object.entries(record).find(([header]) => sanitizeHeader(header) === key);
      return cleanValue(entry ? entry[1] : undefined);
    };

    const firstName = get("first name");
    const mobile = get("mobile number");

    if (!firstName) {
      throw new Error(`Row ${rowNumber}: first name is required`);
    }
    if (!mobile) {
      throw new Error(`Row ${rowNumber}: mobile number is required`);
    }

    let phoneNumber: string;
    try {
      phoneNumber = normalizeWhatsAppPhone(mobile);
    } catch (error: any) {
      const message = error?.message || "Invalid phone number";
      throw new Error(`Row ${rowNumber}: ${message}`);
    }

    const lastName = get("last name");
    const email = get("email");
    const tags = mergeTags(splitTags(get("tags")), options.defaultTags);
    const notes = get("notes");

    const customer: WhatsAppCustomerInput = {
      firstName,
      lastName,
      phoneNumber,
      email,
      tags,
      notes,
      importedFrom: options.sourceName,
      importedAt: new Date(),
    };

    customerInputs.push(customer);

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || firstName;
    const existing = occurrences.get(phoneNumber) ?? [];
    existing.push({ rowNumber, name: displayName });
    occurrences.set(phoneNumber, existing);
  });

  const duplicates = Array.from(occurrences.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([phoneNumber, rows]) => ({ phoneNumber, occurrences: rows }));

  return {
    customers: customerInputs,
    totalRows: records.length,
    uniquePhones: occurrences.size,
    duplicates,
  };
}
