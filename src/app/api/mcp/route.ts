/**
 * MCP (Model Context Protocol) Gateway
 *
 * Single authenticated endpoint for all MCP tool calls.
 * Claude's MCP server calls this route with x-mcp-api-secret header.
 *
 * POST /api/mcp
 * Headers: x-mcp-api-secret: <secret>
 * Body: { tool: string, params: object }
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { normalizeToolParams } from "../../../../mcp-server/src/contracts/tools";
import { McpError, mapPrismaError, summarizeZodError } from "./lib/errors";
import { TOOLS } from "./handlers";

export const dynamic = "force-dynamic";

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function getRequestId(req: Request): string {
  return req.headers.get("x-mcp-request-id") ?? crypto.randomUUID();
}

function authenticateMcp(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  const expected = process.env.MCP_API_SECRET;
  if (!secret || !expected) return false;
  return timingSafeEqualString(secret, expected);
}

function withRequestId(requestId: string, payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ...payload, requestId }, { status });
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  if (!authenticateMcp(req)) {
    return withRequestId(requestId, { success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  let body: { tool: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return withRequestId(requestId, { success: false, error: "Invalid JSON body", code: "BAD_REQUEST" }, 400);
  }

  const tool = body.tool;
  if (!tool) {
    return withRequestId(requestId, { success: false, error: "Missing tool name", code: "BAD_REQUEST" }, 400);
  }

  const handler = TOOLS[tool];
  if (!handler) {
    return withRequestId(
      requestId,
      {
        success: false,
        error: `Unknown tool: ${tool}`,
        code: "UNKNOWN_TOOL",
        availableTools: Object.keys(TOOLS),
      },
      400
    );
  }

  const startedAt = Date.now();

  try {
    const normalizedParams = normalizeToolParams(tool, body.params ?? {});
    const result = await handler(normalizedParams);
    console.error(`[MCP gateway] requestId=${requestId} tool=${tool} status=ok durationMs=${Date.now() - startedAt}`);
    return withRequestId(requestId, { success: true, data: result });
  } catch (err: unknown) {
    console.error(`[MCP gateway] requestId=${requestId} tool=${tool} status=error durationMs=${Date.now() - startedAt}`, err);

    if (err instanceof ZodError) {
      return withRequestId(
        requestId,
        {
          success: false,
          error: `Validation error: ${summarizeZodError(err)}`,
          code: "VALIDATION_ERROR",
          details: err.flatten(),
        },
        422
      );
    }

    if (err instanceof McpError) {
      return withRequestId(
        requestId,
        {
          success: false,
          error: err.message,
          code: err.code,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
        err.statusHint
      );
    }

    const prismaError = mapPrismaError(err);
    if (prismaError) {
      return withRequestId(
        requestId,
        {
          success: false,
          error: prismaError.message,
          code: prismaError.code,
          details: prismaError.details,
        },
        prismaError.statusHint
      );
    }

    const message = err instanceof Error ? err.message : "Internal error";
    return withRequestId(
      requestId,
      { success: false, error: message, code: "INTERNAL_ERROR" },
      500
    );
  }
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  if (!authenticateMcp(req)) {
    return withRequestId(requestId, { success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  return withRequestId(requestId, {
    status: "ok",
    server: "travel-admin-mcp-gateway",
    toolCount: Object.keys(TOOLS).length,
    tools: Object.keys(TOOLS),
  });
}
