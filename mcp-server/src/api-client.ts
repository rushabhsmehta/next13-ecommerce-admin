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

  let json: { success: boolean; data?: unknown; error?: string } | null = null;
  try {
    json = (await res.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
    };
  } catch {
    // JSON parsing failed — fall back to text for a meaningful error
  }

  if (!res.ok) {
    if (!json) {
      const text = await res.text().catch(() => "");
      const message =
        text?.trim() ||
        `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
      throw new Error(message);
    }
    throw new Error(
      json.error ||
        `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`
    );
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
