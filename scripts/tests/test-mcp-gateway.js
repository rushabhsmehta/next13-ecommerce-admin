/**
 * Test script for the /api/mcp gateway.
 *
 * Covers:
 *   - Unauthorized requests (missing / wrong secret) → 401
 *   - Unknown tool → 400
 *   - Missing required params (Zod) → 422
 *   - Valid tool call: get_stats
 *   - Valid tool call: search_locations
 *   - GET /api/mcp without auth → 401
 *   - GET /api/mcp with auth → 200 with tool list
 *
 * Usage:
 *   MCP_API_SECRET=<secret> node scripts/tests/test-mcp-gateway.js
 *   (requires the Next.js dev server running on http://localhost:3000)
 */

const BASE_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const SECRET = process.env.MCP_API_SECRET || "";
const WRONG_SECRET = "definitely-wrong-secret";

let passed = 0;
let failed = 0;

async function post(secret, body) {
  const headers = { "Content-Type": "application/json" };
  if (secret !== null) headers["x-mcp-api-secret"] = secret;
  return fetch(`${BASE_URL}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function get(secret) {
  const headers = {};
  if (secret !== null) headers["x-mcp-api-secret"] = secret;
  return fetch(`${BASE_URL}/api/mcp`, { headers });
}

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ": " + detail : ""}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🧪 Testing MCP Gateway at ${BASE_URL}/api/mcp\n`);

  if (!SECRET) {
    console.error("⚠️  MCP_API_SECRET env variable is not set. Set it before running.\n");
    process.exit(1);
  }

  // ── 1. No secret → 401 ───────────────────────────────────────────────────
  console.log("1. POST without secret header → 401");
  {
    const res = await post(null, { tool: "get_stats", params: {} });
    assert("status is 401", res.status === 401, `got ${res.status}`);
    const json = await res.json();
    assert("body.success is false", json.success === false, JSON.stringify(json));
  }

  // ── 2. Wrong secret → 401 ────────────────────────────────────────────────
  console.log("\n2. POST with wrong secret → 401");
  {
    const res = await post(WRONG_SECRET, { tool: "get_stats", params: {} });
    assert("status is 401", res.status === 401, `got ${res.status}`);
  }

  // ── 3. Unknown tool → 400 ────────────────────────────────────────────────
  console.log("\n3. POST unknown tool → 400");
  {
    const res = await post(SECRET, { tool: "does_not_exist", params: {} });
    assert("status is 400", res.status === 400, `got ${res.status}`);
    const json = await res.json();
    assert("body has availableTools array", Array.isArray(json.availableTools), JSON.stringify(json));
  }

  // ── 4. Missing required params (Zod) → 422 ───────────────────────────────
  console.log("\n4. POST create_inquiry with missing required fields → 422");
  {
    // customerName and numAdults are required
    const res = await post(SECRET, { tool: "create_inquiry", params: { locationName: "Goa" } });
    assert("status is 422", res.status === 422, `got ${res.status}`);
    const json = await res.json();
    assert("body.success is false", json.success === false, JSON.stringify(json));
  }

  // ── 5. Valid tool: get_stats ──────────────────────────────────────────────
  console.log("\n5. POST get_stats → 200 with stats");
  {
    const res = await post(SECRET, { tool: "get_stats", params: {} });
    assert("status is 200", res.status === 200, `got ${res.status}`);
    const json = await res.json();
    assert("body.success is true", json.success === true, JSON.stringify(json));
    assert("data.inquiries exists", json.data?.inquiries !== undefined, JSON.stringify(json.data));
    assert("data.tourQueries exists", json.data?.tourQueries !== undefined, JSON.stringify(json.data));
  }

  // ── 6. Valid tool: search_locations ──────────────────────────────────────
  console.log("\n6. POST search_locations → 200 with array");
  {
    const res = await post(SECRET, { tool: "search_locations", params: { query: "a" } });
    assert("status is 200", res.status === 200, `got ${res.status}`);
    const json = await res.json();
    assert("body.success is true", json.success === true, JSON.stringify(json));
    assert("data is array", Array.isArray(json.data), JSON.stringify(json.data));
  }

  // ── 7. GET without auth → 401 ────────────────────────────────────────────
  console.log("\n7. GET /api/mcp without auth → 401");
  {
    const res = await get(null);
    assert("status is 401", res.status === 401, `got ${res.status}`);
  }

  // ── 8. GET with correct auth → 200 with tool list ────────────────────────
  console.log("\n8. GET /api/mcp with correct auth → 200");
  {
    const res = await get(SECRET);
    assert("status is 200", res.status === 200, `got ${res.status}`);
    const json = await res.json();
    assert("body has tools array", Array.isArray(json.tools), JSON.stringify(json));
    assert("get_stats is listed", json.tools?.includes("get_stats"), JSON.stringify(json.tools));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
