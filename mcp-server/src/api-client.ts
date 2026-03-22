/**
 * HTTP client that calls the Next.js MCP gateway at /api/mcp
 */

import crypto from "crypto";
import { inferToolMetadata } from "./contracts/metadata.js";

const TIMEOUT_MS = parseInt(process.env.MCP_TOOL_TIMEOUT_MS || "30000", 10);
const RETRY_DELAY_MS = parseInt(process.env.MCP_TOOL_RETRY_DELAY_MS || "350", 10);

interface GatewayEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

function getGatewayConfig(requestId: string): { appUrl: string; apiSecret: string } {
  const appUrl = process.env.NEXT_APP_URL;
  const apiSecret = process.env.MCP_API_SECRET;
  const missing: string[] = [];

  if (!appUrl) {
    missing.push("NEXT_APP_URL     - URL of the Next.js admin app (e.g. https://your-app.up.railway.app)");
  }
  if (!apiSecret) {
    missing.push("MCP_API_SECRET   - shared secret for authenticating MCP gateway calls");
  }

  if (missing.length === 0) {
    return {
      appUrl: appUrl as string,
      apiSecret: apiSecret as string,
    };
  }

  throw Object.assign(
    new Error(
      [
        "[MCP_CONFIG_ERROR] Required environment variables are not set:",
        ...missing.map((message) => `  ${message}`),
        "",
        "Set these in mcp-server/.env and restart.",
      ].join("\n")
    ),
    {
      code: "MCP_CONFIG_ERROR",
      details: {
        requestId,
        missing,
      },
    }
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createToolError(
  message: string,
  options: {
    code: string;
    requestId: string;
    attempt: number;
    details?: unknown;
    status?: number;
  }
): Error {
  return Object.assign(new Error(message), {
    code: options.code,
    status: options.status,
    details: {
      requestId: options.requestId,
      attempt: options.attempt,
      ...(options.details !== undefined ? { gateway: options.details } : {}),
    },
  });
}

export async function callTool(
  tool: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const requestId = crypto.randomUUID();
  const { appUrl, apiSecret } = getGatewayConfig(requestId);
  const url = `${appUrl}/api/mcp`;
  const metadata = inferToolMetadata(tool);

  for (let attempt = 1; attempt <= (metadata.retryable ? 2 : 1); attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mcp-api-secret": apiSecret,
          "x-mcp-request-id": requestId,
        },
        body: JSON.stringify({ tool, params }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startedAt;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const code = isAbort ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR";
      const message = isAbort
        ? `[GATEWAY_TIMEOUT] Tool "${tool}" timed out after ${TIMEOUT_MS}ms.`
        : `[NETWORK_ERROR] Cannot reach Next.js app at ${appUrl}. Is it running? (${err})`;

      console.error(
        `[MCP client] requestId=${requestId} tool=${tool} attempt=${attempt} status=${code} durationMs=${durationMs}`
      );

      if (metadata.retryable && attempt === 1) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw createToolError(message, {
        code,
        requestId,
        attempt,
      });
    }

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startedAt;
    const rawText = await response.text().catch(() => "");

    let json: GatewayEnvelope | null = null;
    try {
      json = JSON.parse(rawText) as GatewayEnvelope;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const code = json?.code || `HTTP_${response.status}`;
      const message =
        json?.error ||
        rawText.trim() ||
        `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

      console.error(
        `[MCP client] requestId=${requestId} tool=${tool} attempt=${attempt} status=${code} durationMs=${durationMs}`
      );

      if (metadata.retryable && attempt === 1 && (response.status === 502 || response.status === 503)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw createToolError(message, {
        code,
        requestId: json?.requestId || requestId,
        attempt,
        details: json?.details,
        status: response.status,
      });
    }

    if (!json) {
      throw createToolError("MCP gateway returned a non-JSON success response", {
        code: "INVALID_GATEWAY_RESPONSE",
        requestId,
        attempt,
      });
    }

    if (!json.success) {
      throw createToolError(
        json.error || `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        {
          code: json.code || "INTERNAL_ERROR",
          requestId: json.requestId || requestId,
          attempt,
          details: json.details,
          status: response.status,
        }
      );
    }

    console.error(
      `[MCP client] requestId=${json.requestId || requestId} tool=${tool} attempt=${attempt} status=ok durationMs=${durationMs}`
    );
    return json.data;
  }

  throw createToolError(`Tool "${tool}" failed after retries`, {
    code: "RETRY_EXHAUSTED",
    requestId: crypto.randomUUID(),
    attempt: 2,
  });
}