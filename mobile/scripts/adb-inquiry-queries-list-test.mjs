/**
 * USB smoke test: inquiry list shows linked tour queries.
 *
 * Prereqs: adb device, npm run dev (:3000), npm run start:staff (:8082),
 * MOBILE_DEV_AUTH_BYPASS_* on server.
 *
 * Usage (from mobile/):
 *   node scripts/adb-inquiry-queries-list-test.mjs
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const PKG = "com.aagamholidays.staff";
const SCHEME = "exp+aagam-staff";
const PORT = metroPortForVariant("staff");
const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";
const API = "http://127.0.0.1:3000";

function resolveAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && `${process.env.ANDROID_HOME}/platform-tools/adb.exe`,
    `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`,
    "adb",
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (c === "adb") {
        execSync("adb version", { encoding: "utf8", stdio: "pipe" });
        return "adb";
      }
      if (existsSync(c)) return `"${c}"`;
    } catch {
      /* next */
    }
  }
  throw new Error("adb not found");
}

const ADB = resolveAdb();
function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function dump(tag) {
  adb("shell uiautomator dump /sdcard/ui.xml");
  const xml = adb("shell cat /sdcard/ui.xml");
  console.log(`[${tag}] UI dump (${xml.length} bytes)`);
  return xml;
}
function hasText(xml, text) {
  return xml.includes(`text="${text}"`) || xml.includes(text);
}
function center(bounds) {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
  if (!m) return null;
  return [Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2)];
}
function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}
function tapResource(xml, id) {
  const re = new RegExp(`resource-id="${id}"[^>]*bounds="([^"]+)"`);
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}
function tapText(xml, text) {
  const re = new RegExp(`text="${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*bounds="([^"]+)"`);
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}

async function bypassLogin(xml) {
  if (hasText(xml, "accounts.google.com") || hasText(xml, "Sign in with Google")) {
    adb("shell input keyevent 4");
    await sleep(1500);
    return false;
  }
  if (hasText(xml, "Hide developer sign-in") || xml.includes("login-dev-bypass-token")) {
    /* expanded */
  } else if (hasText(xml, "Developer sign-in (bypass Clerk)")) {
    tapResource(xml, "login-dev-bypass-toggle") || tap(540, 1720);
    await sleep(800);
    xml = dump("bypass-form");
  } else if (!tapResource(xml, "login-dev-bypass-toggle")) {
    return false;
  } else {
    await sleep(800);
    xml = dump("bypass-form");
  }
  if (!xml.includes("login-dev-bypass-token")) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(500);
    xml = dump("bypass-scrolled");
  }
  if (!tapResource(xml, "login-dev-bypass-continue")) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(400);
    if (!tapResource(dump("bypass-scroll2"), "login-dev-bypass-continue")) tap(540, 1280);
  }
  await sleep(4000);
  return true;
}

async function ensureSignedIn() {
  adb(`reverse tcp:${PORT} tcp:${PORT}`);
  adb("reverse tcp:3000 tcp:3000");
  const url = encodeURIComponent(`http://127.0.0.1:${PORT}`);
  adb(`shell am force-stop ${PKG}`);
  adb(
    `shell am start -a android.intent.action.VIEW -d "${SCHEME}://expo-development-client/?url=${url}" ${PKG}`
  );
  await sleep(12000);
  let xml = dump("launch");

  if (hasText(xml, "Connect") || hasText(xml, "DEVELOPMENT SERVERS")) {
    tap(540, 680);
    await sleep(12000);
    xml = dump("connected");
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    if (
      xml.includes("operations-admin-hub") ||
      xml.includes("operations-hub-sign-in") ||
      hasText(xml, "Sign in required") ||
      hasText(xml, "Welcome back") ||
      xml.includes("login-screen") ||
      hasText(xml, "Admin access required") ||
      xml.length > 12_000
    ) {
      break;
    }
    console.log(`[ensureSignedIn] Waiting for app UI (${attempt + 1}/20)...`);
    await sleep(3000);
    xml = dump(`launch-wait-${attempt}`);
  }

  async function openSignInAndBypass(current) {
    if (
      hasText(current, "Admin access required") ||
      current.includes("operations-hub-sign-in") ||
      hasText(current, "Sign in required")
    ) {
      tapResource(current, "operations-hub-sign-in") ||
        tapText(current, "Sign in") ||
        tap(540, 1180);
      await sleep(4000);
      current = dump("signin-prompt");
    }
    if (hasText(current, "Welcome back") || current.includes("login-screen")) {
      adb("shell input swipe 540 1300 540 700 300");
      await sleep(600);
      current = dump("login");
      if (!(await bypassLogin(current))) {
        tap(540, 1720);
        await sleep(800);
        if (!(await bypassLogin(dump("login-retry")))) {
          throw new Error("Dev bypass login failed");
        }
      }
      await sleep(10000);
      current = dump("post-login");
    }
    return current;
  }

  xml = await openSignInAndBypass(xml);

  if (!xml.includes("operations-admin-hub")) {
    tapResource(xml, "tab-admin-icon") || tapText(xml, "Menu") || tapText(xml, "Tools");
    await sleep(4000);
    xml = dump("admin-tab");
  }

  if (
    !xml.includes("operations-admin-hub") &&
    (xml.includes("operations-hub-sign-in") || hasText(xml, "Sign in required"))
  ) {
    xml = await openSignInAndBypass(xml);
    if (!xml.includes("operations-admin-hub")) {
      tapResource(xml, "tab-admin-icon") || tapText(xml, "Tools");
      await sleep(4000);
      xml = dump("admin-tab-after-login");
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    if (xml.includes("operations-hub-loading") && !xml.includes("operations-admin-hub")) {
      await sleep(1500);
      xml = dump(`hub-loading-${attempt}`);
    } else break;
  }

  if (!xml.includes("operations-admin-hub")) {
    throw new Error("Operations hub not visible — sign in and reload the app");
  }
  return xml;
}

async function main() {
  const res = await fetch(
    `${API}/api/mobile/crm/inquiries?limit=20&status=pending`,
    {
      headers: {
        Authorization: `Bearer ${BYPASS}`,
        "X-Mobile-App-Variant": "staff",
      },
    }
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const withQueries = (data.items ?? []).filter((i) => (i.tourPackageQueries ?? []).length > 0);
  if (withQueries.length === 0) throw new Error("No inquiries with tour queries in API");
  const sample = withQueries[0];
  const sampleQuery = sample.tourPackageQueries[0];
  const expectedLabel =
    sampleQuery.tourPackageQueryName?.trim() ||
    sampleQuery.tourPackageQueryNumber?.trim() ||
    `Query ${sampleQuery.id.slice(0, 8)}`;
  console.log("API sample:", sample.customerName, "→", expectedLabel);
  console.log("Query testID suffix:", sampleQuery.id);

  let xml = await ensureSignedIn();

  console.log("\n--- Navigate: Inquiries list ---");
  if (
    !tapResource(xml, "admin-hub-section-priority-item-inquiries") &&
    !tapResource(xml, "admin-hub-section-crm-item-inquiries") &&
    !tapResource(xml, "admin-hub-section-dashboard-item-inquiries") &&
    !tapResource(xml, "operations-stat-open-inquiries")
  ) {
    throw new Error("Could not open Inquiries from hub");
  }
  await sleep(6000);
  xml = dump("inquiries-list");

  if (!xml.includes("crm-inquiries-screen")) {
    throw new Error("Inquiries list screen not found (crm-inquiries-screen)");
  }

  const queryTestId = `inquiry-query-${sample.id}-${sampleQuery.id}`;
  const checks = {
    inquiriesScreen: xml.includes("crm-inquiries-screen"),
    tourQueriesSection: hasText(xml, "Tour queries"),
    queryRowTestId: xml.includes(queryTestId),
    sampleCustomerRow: xml.includes(`inquiry-row-${sample.id}`),
    sampleQueryLabel: hasText(xml, expectedLabel.slice(0, 16)),
  };
  console.log("UI checks:", checks);

  const passed =
    checks.inquiriesScreen &&
    checks.tourQueriesSection &&
    (checks.queryRowTestId || checks.sampleQueryLabel);
  if (!passed) {
    const ids = [...xml.matchAll(/resource-id="([^"]+)"/g)].map((m) => m[1]);
    console.log(
      "Resource IDs (query/inquiry):",
      ids.filter((id) => /inquiry|query|crm/i.test(id)).slice(0, 25)
    );
    process.exit(1);
  }
  console.log("\nPASS: Tour queries visible on inquiry list on device");
}

main().catch((e) => {
  console.error("FAIL:", e.message || e);
  process.exit(1);
});
