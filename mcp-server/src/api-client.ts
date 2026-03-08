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

  const json = (await res.json()) as { success: boolean; data?: unknown; error?: string };

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json.data;
}
