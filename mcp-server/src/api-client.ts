/**
 * HTTP client that calls the Next.js MCP gateway at /api/mcp
 */

const NEXT_APP_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const MCP_API_SECRET = process.env.MCP_API_SECRET || "";

if (!MCP_API_SECRET) {
  console.error("[MCP] Warning: MCP_API_SECRET env variable is not set");
}

export async function callTool(
  tool: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${NEXT_APP_URL}/api/mcp`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-api-secret": MCP_API_SECRET,
      },
      body: JSON.stringify({ tool, params }),
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Next.js app at ${NEXT_APP_URL}. Is it running? (${err})`
    );
  }

  // Read the body once as text, then attempt JSON parsing.
  // This avoids the "body already consumed" problem that occurs when res.json()
  // throws and res.text() is called on an already-consumed stream.
  const rawText = await res.text().catch(() => "");

  let json: { success: boolean; data?: unknown; error?: string } | null = null;
  try {
    json = JSON.parse(rawText) as {
      success: boolean;
      data?: unknown;
      error?: string;
    };
  } catch {
    // Response body is not JSON
  }

  if (!res.ok) {
    const message =
      json?.error ||
      rawText.trim() ||
      `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
    throw new Error(message);
  }

  if (!json) {
    throw new Error(
      "MCP gateway returned a non-JSON response for a successful request"
    );
  }

  if (!json.success) {
    throw new Error(
      json.error ||
        `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`
    );
  }

  return json.data;
}
