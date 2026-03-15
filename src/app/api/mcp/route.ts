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

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { McpError, mapPrismaError, summarizeZodError } from "./lib/errors";
import { TOOLS } from "./handlers";

export const dynamic = "force-dynamic";

// ── Auth ────────────────────────────────────────────────────────────────────

function authenticateMcp(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  if (!secret || !process.env.MCP_API_SECRET) return false;
  return secret === process.env.MCP_API_SECRET;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!authenticateMcp(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { tool: string; params: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool, params = {} } = body;

  if (!tool) {
    return NextResponse.json({ success: false, error: "Missing tool name" }, { status: 400 });
  }

  const handler = TOOLS[tool];
  if (!handler) {
    return NextResponse.json(
      {
        success: false,
        error: `Unknown tool: ${tool}`,
        availableTools: Object.keys(TOOLS),
      },
      { status: 400 }
    );
  }

  try {
    const result = await handler(params);
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error(`[MCP] Tool ${tool} failed:`, err);

    // Zod validation errors → 422 Unprocessable Entity
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${summarizeZodError(err)}`,
          code: "VALIDATION_ERROR",
          details: err.flatten(),
        },
        { status: 422 }
      );
    }

    // Typed McpError hierarchy (includes NotFoundError, etc.)
    if (err instanceof McpError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: err.code,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
        { status: err.statusHint }
      );
    }

    // Prisma-specific errors
    const pe = mapPrismaError(err);
    if (pe) {
      return NextResponse.json(
        { success: false, error: pe.message, code: pe.code, details: pe.details },
        { status: pe.statusHint }
      );
    }

    // Generic fallback
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// Health-check GET — requires the same x-mcp-api-secret to avoid leaking capability details
export async function GET(req: Request) {
  if (!authenticateMcp(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ok",
    server: "travel-admin-mcp-gateway",
    toolCount: Object.keys(TOOLS).length,
    tools: Object.keys(TOOLS),
  });
}
