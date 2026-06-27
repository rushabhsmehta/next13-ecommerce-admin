#!/usr/bin/env node
/**
 * Verify MCP server and gateway environment configuration.
 *
 * Usage:
 *   node scripts/verify-mcp-env.mjs
 *   node scripts/verify-mcp-env.mjs --health https://your-mcp.up.railway.app/health
 */

const args = process.argv.slice(2);
const healthUrlIndex = args.indexOf("--health");
const healthUrl = healthUrlIndex >= 0 ? args[healthUrlIndex + 1] : null;

const HTTP_REQUIRED = [
  "NEXT_APP_URL",
  "MCP_API_SECRET",
  "MCP_PUBLIC_URL",
  "MCP_APPROVAL_SECRET",
];

const HTTP_RECOMMENDED = [
  "MCP_TOKEN_SECRET",
  "MCP_CLIENTS_FILE",
];

function checkEnv(keys) {
  const results = [];
  for (const key of keys) {
    const value = process.env[key];
    results.push({
      key,
      present: Boolean(value && String(value).trim().length > 0),
      value: value ? "(set)" : "(missing)",
    });
  }
  return results;
}

function isEphemeralClientsFile(filePath) {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/tmp/") || normalized.endsWith("/tmp");
}

async function fetchHealth(url) {
  const response = await fetch(url);
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

console.log("Travel Admin MCP — environment verification\n");

const required = checkEnv(HTTP_REQUIRED);
const recommended = checkEnv(HTTP_RECOMMENDED);

let hasErrors = false;

console.log("Required (HTTP mode):");
for (const entry of required) {
  const mark = entry.present ? "OK" : "MISSING";
  if (!entry.present) hasErrors = true;
  console.log(`  [${mark}] ${entry.key}`);
}

console.log("\nRecommended:");
for (const entry of recommended) {
  const mark = entry.present ? "OK" : "WARN";
  console.log(`  [${mark}] ${entry.key}`);
}

const clientsFile = process.env.MCP_CLIENTS_FILE ?? "/tmp/mcp-clients.json";
if (isEphemeralClientsFile(clientsFile)) {
  console.log("\n[WARN] MCP_CLIENTS_FILE uses ephemeral storage:");
  console.log(`       ${clientsFile}`);
  console.log("       OAuth clients are lost on redeploy — set MCP_CLIENTS_FILE=/data/mcp-clients.json with a Railway volume.");
} else {
  console.log(`\n[OK] MCP_CLIENTS_FILE is persistent: ${clientsFile}`);
}

if (!process.env.MCP_TOKEN_SECRET) {
  console.log("\n[WARN] MCP_TOKEN_SECRET is not set — bearer tokens will be insecure and may break after redeploy.");
}

if (healthUrl) {
  console.log(`\nChecking health endpoint: ${healthUrl}`);
  try {
    const health = await fetchHealth(healthUrl);
    if (!health.ok) {
      hasErrors = true;
      console.log(`  [FAIL] HTTP ${health.status}`);
    } else {
      console.log("  [OK] Health check passed");
      if (health.body?.config) {
        console.log("  Config:", JSON.stringify(health.body.config, null, 2));
      }
    }
  } catch (error) {
    hasErrors = true;
    console.log(`  [FAIL] ${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  console.log("\nTip: pass --health https://your-mcp-server/health to verify a deployed instance.");
}

console.log("\nNext.js admin app must also define:");
console.log("  MCP_API_SECRET (must match mcp-server)");
console.log("  MCP_APPROVAL_SECRET (must match mcp-server)");

process.exit(hasErrors ? 1 : 0);
