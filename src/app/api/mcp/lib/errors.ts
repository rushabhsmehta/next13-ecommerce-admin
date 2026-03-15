import { ZodError } from "zod";

// ── Custom error types ────────────────────────────────────────────────────────

export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusHint: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "McpError";
  }
}

export class NotFoundError extends McpError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, code, 404);
    this.name = "NotFoundError";
  }
}

// ── Prisma error mapper ───────────────────────────────────────────────────────

export function mapPrismaError(err: unknown): McpError | null {
  if (typeof err !== "object" || err === null || !("code" in err)) return null;
  const c = (err as any).code as string;
  const meta = (err as any).meta as Record<string, unknown> | undefined;
  switch (c) {
    case "P2002": {
      const fields = Array.isArray(meta?.target) ? (meta!.target as string[]).join(", ") : "unknown";
      return new McpError(
        `Duplicate value: a record with this ${fields} already exists`,
        "DB_CONSTRAINT", 409, { prismaCode: c, fields }
      );
    }
    case "P2025":
      return new McpError("Record not found or already deleted", "NOT_FOUND", 404, { prismaCode: c });
    case "P2003": {
      const field = meta?.field_name ?? "unknown";
      return new McpError(
        `Foreign key constraint failed on: ${field}`,
        "DB_CONSTRAINT", 409, { prismaCode: c, field }
      );
    }
    case "P2000": {
      const field = meta?.column_name ?? "unknown";
      return new McpError(
        `Value too long for field: ${field}`,
        "DB_VALUE_TOO_LONG", 422, { prismaCode: c, field }
      );
    }
    default: return null;
  }
}

// ── Zod error summarizer ──────────────────────────────────────────────────────

export function summarizeZodError(err: ZodError): string {
  const flat = err.flatten();
  const parts = [
    ...Object.entries(flat.fieldErrors).slice(0, 3).map(([f, m]) => `${f}: ${(m ?? []).join("; ")}`),
    ...flat.formErrors.slice(0, 2),
  ];
  return parts.length ? parts.join(" | ") : "Invalid parameters";
}
