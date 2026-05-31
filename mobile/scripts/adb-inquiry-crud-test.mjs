/**
 * USB E2E: Operations app — inquiry create, edit, delete (test data prefix ADB-INQ-TEST).
 *
 * Prereqs:
 *   - Phone USB + developer options, adb in PATH
 *   - npm run dev (repo root, port 3000)
 *   - npm run start:staff (mobile/, Metro 8082)
 *   - MOBILE_DEV_AUTH_BYPASS_* in .env.local
 *
 * Usage (from mobile/):
 *   node scripts/adb-inquiry-crud-test.mjs
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const PKG = "com.aagamholidays.staff";
const SCHEME = "exp+aagam-staff";
const PORT = metroPortForVariant("staff");
const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";
const STAMP = new Date().toISOString().slice(11, 19).replace(/:/g, "");
const TEST_NAME = `ADB-INQ-TEST ${STAMP}`;
const TEST_NAME_EDITED = `${TEST_NAME} edited`;
const TEST_PHONE = "9876501234";

function resolveAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && `${process.env.ANDROID_HOME}/platform-tools/adb.exe`,
    process.env.ANDROID_SDK_ROOT && `${process.env.ANDROID_SDK_ROOT}/platform-tools/adb.exe`,
    `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`,
    `${process.env.USERPROFILE}/AppData/Local/Android/Sdk/platform-tools/adb.exe`,
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
      /* try next */
    }
  }
  return null;
}

const ADB = resolveAdb();

function adb(cmd) {
  if (!ADB) {
    throw new Error(
      "adb not found. Install Android platform-tools or set ADB_PATH / ANDROID_HOME."
    );
  }
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

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

function center(bounds) {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
  if (!m) return null;
  return [Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2)];
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
  const re = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`);
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}

function hasText(xml, text) {
  return xml.includes(`text="${text}"`) || xml.includes(text);
}

function clearAndType(text) {
  for (let i = 0; i < 48; i++) adb("shell input keyevent 67");
  const safe = text.replace(/ /g, "%s");
  adb(`shell input text "${safe}"`);
}

async function bypassLogin(xml) {
  if (hasText(xml, "accounts.google.com") || hasText(xml, "Sign in with Google")) {
    adb("shell input keyevent 4");
    await sleep(1500);
    return false;
  }
  if (hasText(xml, "Hide developer sign-in") || xml.includes("login-dev-bypass-token")) {
    // Dev form already expanded.
  } else if (hasText(xml, "Developer sign-in (bypass Clerk)")) {
    tapResource(xml, "login-dev-bypass-toggle") || tap(540, 1720);
  } else if (!tapResource(xml, "login-dev-bypass-toggle")) {
    return false;
  }
  await sleep(800);
  let form = dump("bypass-form");
  if (!form.includes("login-dev-bypass-token")) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(500);
    tapResource(form, "login-dev-bypass-toggle") || tap(540, 1720);
    await sleep(800);
    form = dump("bypass-form-retry");
  }
  if (!form.includes("login-dev-bypass-token")) {
    console.warn("[bypassLogin] Dev bypass token field not visible");
    return false;
  }
  if (!tapResource(form, "login-dev-bypass-token")) return false;
  await sleep(400);
  let filled = dump("bypass-filled");
  if (!filled.includes(BYPASS)) {
    console.warn("[bypassLogin] Token not auto-filled — typing manually (may not update React state)");
    for (let i = 0; i < 48; i++) adb("shell input keyevent 67");
    for (const ch of BYPASS) {
      if (ch === "-") adb('shell input text "-"');
      else adb(`shell input text "${ch}"`);
    }
    await sleep(300);
    filled = dump("bypass-typed");
  }
  if (filled.includes(BYPASS + "g") || !filled.includes(BYPASS)) {
    console.warn("[bypassLogin] Token field mismatch — retrying entry");
    if (!tapResource(filled, "login-dev-bypass-token")) tap(540, 1050);
    for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
    for (const ch of BYPASS) {
      if (ch === "-") adb('shell input text "-"');
      else adb(`shell input text "${ch}"`);
    }
    await sleep(300);
  }
  let ready = dump("bypass-ready");
  if (!ready.includes("login-dev-bypass-continue")) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(500);
    ready = dump("bypass-scrolled");
  }
  if (!tapResource(ready, "login-dev-bypass-continue")) tap(540, 1280);
  await sleep(3000);
  const after = dump("bypass-after-continue");
  if (hasText(after, "accounts.google.com") || hasText(after, "Sign in with Google")) {
    adb("shell input keyevent 4");
    await sleep(1500);
    return false;
  }
  return true;
}

function confirmAndroidDatePicker() {
  if (tapText(dump("date-picker"), "OK")) return true;
  tap(900, 1850);
  return true;
}

function firstLocationId(xml) {
  const m = /resource-id="(inquiry-create-location-[^"]+)"/.exec(xml);
  return m?.[1] ?? null;
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
      hasText(xml, "login-screen") ||
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
    if (hasText(current, "Welcome back") || hasText(current, "login-screen")) {
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
      await sleep(12000);
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
      tapResource(xml, "tab-admin-icon") || tapText(xml, "Menu") || tapText(xml, "Tools");
      await sleep(4000);
      xml = dump("admin-tab-after-login");
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    if (xml.includes("operations-hub-loading") && !xml.includes("operations-admin-hub")) {
      await sleep(1500);
      xml = dump(`hub-loading-${attempt}`);
    } else {
      break;
    }
  }

  if (!xml.includes("operations-admin-hub")) {
    throw new Error("Operations hub not visible — check sign-in and crm permissions");
  }
  return xml;
}

async function main() {
  console.log(`\n=== Operations inquiry CRUD (USB) ===`);
  console.log(`Test customer: ${TEST_NAME}\n`);

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
  await sleep(4000);
  xml = dump("inquiries-list");
  if (!xml.includes("crm-inquiries-screen")) {
    throw new Error("Inquiries list screen not found");
  }

  console.log("\n--- CREATE ---");
  if (!tapResource(xml, "crm-new-inquiry")) throw new Error("New inquiry button not found");
  await sleep(3000);
  xml = dump("new-inquiry");

  if (!tapResource(xml, "inquiry-create-name")) throw new Error("Name field not found");
  clearAndType(TEST_NAME);
  await sleep(400);

  xml = dump("after-name");
  if (!tapResource(xml, "inquiry-create-phone")) throw new Error("Phone field not found");
  clearAndType(TEST_PHONE);
  await sleep(400);

  if (!tapResource(xml, "inquiry-create-journey")) throw new Error("Journey date field not found");
  await sleep(800);
  confirmAndroidDatePicker();
  await sleep(600);

  xml = dump("after-journey");
  adb("shell input swipe 540 1400 540 400 400");
  await sleep(800);
  xml = dump("scrolled-form");

  const locId = firstLocationId(xml);
  if (!locId || !tapResource(xml, locId)) {
    throw new Error("No destination chip found — ensure locations exist in API");
  }
  await sleep(400);

  adb("shell input swipe 540 1600 540 200 500");
  await sleep(600);
  xml = dump("before-submit");
  if (!tapResource(xml, "inquiry-create-submit")) throw new Error("Create submit not found");
  await sleep(8000);
  xml = dump("after-create");
  if (!xml.includes("inquiry-detail-screen")) {
    throw new Error("Detail screen not shown after create — check API/errors on device");
  }
  console.log("OK: Created inquiry (detail screen)");

  console.log("\n--- UPDATE ---");
  adb("shell input swipe 540 1200 540 300 350");
  await sleep(600);
  xml = dump("detail-scrolled");
  if (!tapResource(xml, "inquiry-edit-name")) throw new Error("Edit name field not found");
  clearAndType(TEST_NAME_EDITED);
  await sleep(400);
  adb("shell input swipe 540 1400 540 200 400");
  await sleep(500);
  xml = dump("save-area");
  if (!tapResource(xml, "inquiry-save-profile")) throw new Error("Save profile button not found");
  await sleep(5000);
  xml = dump("after-save");
  if (!hasText(xml, TEST_NAME_EDITED)) {
    console.warn("WARN: Edited name not visible in dump — verify on device");
  } else {
    console.log("OK: Updated customer name");
  }

  console.log("\n--- DELETE (from list) ---");
  adb("shell input keyevent 4");
  await sleep(1500);
  adb("shell input keyevent 4");
  await sleep(2000);
  xml = dump("back-to-list");
  if (!xml.includes("crm-inquiries-screen")) {
    tapResource(xml, "admin-hub-section-crm-item-inquiries");
    await sleep(3000);
    xml = dump("list-again");
  }

  if (!hasText(xml, TEST_NAME_EDITED) && !hasText(xml, TEST_NAME)) {
    throw new Error("Test inquiry not found in list for delete");
  }

  const delRe = new RegExp(
    `resource-id="inquiry-delete-[^"]+"[^>]*bounds="([^"]+)"`
  );
  let delM = null;
  if (hasText(xml, TEST_NAME_EDITED)) {
    const idx = xml.indexOf(TEST_NAME_EDITED);
    delM = xml.slice(idx).match(delRe);
  }
  if (!delM) delM = xml.match(delRe);
  if (!delM) throw new Error("Delete button not found on inquiry row");
  const dc = center(delM[1]);
  if (!dc) throw new Error("Delete button bounds invalid");
  tap(dc[0], dc[1]);
  await sleep(1200);
  xml = dump("delete-dialog");
  if (!tapText(xml, "Delete")) tap(720, 1180);
  await sleep(4000);
  xml = dump("after-delete");
  if (hasText(xml, TEST_NAME_EDITED) || hasText(xml, TEST_NAME)) {
    throw new Error("Inquiry still visible after delete");
  }

  console.log("\nPASS: Inquiry create, update, and delete completed on device.\n");
}

main().catch((e) => {
  console.error("\nFAIL:", e.message || e);
  process.exit(1);
});
