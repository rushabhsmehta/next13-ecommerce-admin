import { z, type ZodRawShape } from "zod";

export type ToolAccess = "read" | "write";

export interface ToolMetadata {
  access: ToolAccess;
  retryable: boolean;
}

export interface ToolContract<Shape extends ZodRawShape = ZodRawShape> extends ToolMetadata {
  name: string;
  description: string;
  inputSchema: Shape;
  normalize?: (params: Record<string, unknown>) => Record<string, unknown>;
}

export function defineToolContract<const Shape extends ZodRawShape>(
  contract: ToolContract<Shape>
): ToolContract<Shape> {
  return contract;
}

export function asInputRecord(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return {};
  }

  return params as Record<string, unknown>;
}

export function parseToolContractInput<Shape extends ZodRawShape>(
  contract: ToolContract<Shape>,
  params: unknown
): z.infer<z.ZodObject<Shape>> {
  const parsed = z.object(contract.inputSchema).passthrough().parse(asInputRecord(params));
  if (!contract.normalize) {
    return z.object(contract.inputSchema).parse(parsed);
  }

  return contract.normalize(parsed as Record<string, unknown>) as z.infer<z.ZodObject<Shape>>;
}

