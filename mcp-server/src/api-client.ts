/**
 * HTTP client that calls the Next.js MCP gateway at /api/mcp
 */

// Validate required env vars at startup — fail fast with a clear message rather
// than silently falling back to defaults and producing confusing errors later.
const NEXT_APP_URL = process.env.NEXT_APP_URL;
const MCP_API_SECRET = process.env.MCP_API_SECRET;

(function validateEnv() {
  const missing: string[] = [];
  if (!NEXT_APP_URL)
    missing.push("NEXT_APP_URL     — URL of the Next.js admin app (e.g. https://your-app.up.railway.app)");
  if (!MCP_API_SECRET)
    missing.push("MCP_API_SECRET   — shared secret for authenticating MCP gateway calls");
  if (missing.length === 0) return;
  console.error("[MCP] FATAL: Required environment variables are not set:");
  missing.forEach((m) => console.error(`  ${m}`));
  console.error("\nSet these in mcp-server/.env and restart.");
  process.exit(1);
})();

const APP_URL = NEXT_APP_URL as string;
const API_SECRET = MCP_API_SECRET as string;

// Request timeout in ms — default 30 s, override with MCP_TOOL_TIMEOUT_MS.
// generate_itinerary calls Gemini which can take 10–20 s; 30 s gives headroom.
const TIMEOUT_MS = parseInt(process.env.MCP_TOOL_TIMEOUT_MS || "30000", 10);

export async function callTool(
  tool: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${APP_URL}/api/mcp`;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-api-secret": API_SECRET,
      },
      body: JSON.stringify({ tool, params }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw Object.assign(
        new Error(
          `[GATEWAY_TIMEOUT] Tool "${tool}" timed out after ${TIMEOUT_MS}ms. ` +
          `The Next.js app may be overloaded or still starting up — try again in a moment.`
        ),
        { code: "GATEWAY_TIMEOUT" }
      );
    }
    throw Object.assign(
      new Error(`[NETWORK_ERROR] Cannot reach Next.js app at ${APP_URL}. Is it running? (${err})`),
      { code: "NETWORK_ERROR" }
    );
  } finally {
    clearTimeout(tid);
  }

  // Read the body once as text, then attempt JSON parsing.
  // This avoids the "body already consumed" problem that occurs when res.json()
  // throws and res.text() is called on an already-consumed stream.
  const rawText = await res.text().catch(() => "");

  let json: { success: boolean; data?: unknown; error?: string; code?: string; details?: unknown } | null = null;
  try {
    json = JSON.parse(rawText) as {
      success: boolean;
      data?: unknown;
      error?: string;
      code?: string;
      details?: unknown;
    };
  } catch {
    // Response body is not JSON
  }

  if (!res.ok) {
    const message =
      json?.error ||
      rawText.trim() ||
      `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
    // Propagate structured error code and details from gateway so toolError()
    // in server.ts can surface them to the AI agent.
    throw Object.assign(new Error(message), {
      code: json?.code,
      details: json?.details,
    });
  }

  if (!json) {
    throw new Error(
      "MCP gateway returned a non-JSON response for a successful request"
    );
  }

  if (!json.success) {
    throw Object.assign(
      new Error(
        json.error ||
          `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`
      ),
      { code: json.code, details: json.details }
    );
  }

  return json.data;
}
