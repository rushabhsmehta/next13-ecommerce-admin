import { z } from "zod";

/** ISO date-only string (YYYY-MM-DD) — matches what parseISO() expects in dateToUtc() */
export const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" });

/** Standard limit param with configurable max */
export const limitParam = (max = 100, def = 20) =>
  z.number().int().min(1).max(max).optional().default(def);

/** Handler function type */
export type ToolHandler = (params: unknown) => Promise<unknown>;

/** Handler record type for merging */
export type ToolHandlerMap = Record<string, ToolHandler>;
