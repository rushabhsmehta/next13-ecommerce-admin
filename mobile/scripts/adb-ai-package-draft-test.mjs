/**
 * USB smoke test: AI Package Wizard draft → Create new package keeps itinerary days.
 *
 * Requires: adb device, Metro staff :8082, Next.js :3000, MOBILE_DEV_AUTH_BYPASS_*
 *
 * Usage: node ./scripts/adb-ai-package-draft-test.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const PKG = "com.aagamholidays.staff";
const PORT = metroPortForVariant("staff");

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
  if (!ADB) throw new Error("adb not found.");
  return execSync(`${ADB} ${cmd}`, { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dump(tag) {
  adb("shell uiautomator dump /sdcard/ui.xml");
  const xml = adb("shell cat /sdcard/ui.xml");
  writeFileSync(`ui_dump_ai_pkg_${tag}.xml`, xml, "utf8");
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
  if (!m) {
    // RN often puts resource-id after other attrs
    const re2 = new RegExp(`bounds="([^"]+)"[^>]*resource-id="${id}"`);
    const m2 = re2.exec(xml);
    if (!m2) return false;
    const c = center(m2[1]);
    if (!c) return false;
    tap(c[0], c[1]);
    return true;
  }
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}

function tapText(xml, text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`text="${escaped}"[^>]*bounds="([^"]+)"`, "i");
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

function hasResource(xml, id) {
  return xml.includes(`resource-id="${id}"`);
}

const METRO_HOST = `127.0.0.1:${PORT}`;

function typeAdbText(text) {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/ /g, "%s")
    .replace(/:/g, "\\:")
    .replace(/\//g, "\\/");
  adb(`shell input text "${escaped}"`);
}

function dismissSystemDialogs(xml) {
  if (hasText(xml, "send you notifications")) {
    tapText(xml, "Allow") || tapText(xml, "Don't allow") || tap(270, 1330);
    return true;
  }
  return false;
}

async function connectDevClientToMetro(xml) {
  if (dismissSystemDialogs(xml)) {
    await sleep(1500);
    xml = dump("after-notification");
  }
  if (!hasText(xml, "Connect") && !hasText(xml, "DEVELOPMENT SERVERS")) return xml;

  for (let i = 0; i < 12; i++) {
    if (hasText(xml, "8082") || hasText(xml, "127.0.0.1")) {
      if (tapText(xml, "8082") || tapText(xml, "127.0.0.1")) {
        await sleep(20000);
        return dump("metro-auto");
      }
    }
    console.log(`[connect] Waiting for Metro discovery (${i + 1}/12)...`);
    await sleep(3000);
    xml = dump(`metro-discovery-${i}`);
  }

  tap(400, 1104);
  await sleep(400);
  typeAdbText(METRO_HOST);
  await sleep(600);
  const filled = dump("metro-url-filled");
  if (!tapText(filled, "Connect")) tap(540, 1275);
  await sleep(22000);
  return dump("metro-connected");
}

async function bypassLogin(xml) {
  if (hasText(xml, "accounts.google.com") || hasText(xml, "Sign in with Google")) {
    adb("shell input keyevent 4");
    await sleep(1500);
    return false;
  }
  if (!tapResource(xml, "login-dev-bypass-toggle")) {
    if (hasText(xml, "Developer sign-in (bypass Clerk)")) tap(540, 1720);
    else return false;
  }
  await sleep(1200);
  xml = dump("bypass-form");
  if (!xml.includes("login-dev-bypass-continue")) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(500);
    xml = dump("bypass-scrolled");
  }
  if (!tapResource(xml, "login-dev-bypass-continue")) {
    throw new Error("Could not tap login-dev-bypass-continue");
  }
  await sleep(4000);
  return true;
}

async function ensureSignedIn() {
  adb(`reverse tcp:${PORT} tcp:${PORT}`);
  adb("reverse tcp:3000 tcp:3000");
  adb(`shell am force-stop ${PKG}`);
  adb(`shell am start -n ${PKG}/com.aagamholidays.app.MainActivity`);
  await sleep(8000);
  let xml = dump("launch");

  for (let attempt = 0; attempt < 15; attempt++) {
    if (dismissSystemDialogs(xml)) {
      await sleep(1500);
      xml = dump(`dialog-${attempt}`);
    }
    if (hasText(xml, "Connect") || hasText(xml, "DEVELOPMENT SERVERS")) {
      xml = await connectDevClientToMetro(xml);
      continue;
    }
    if (hasText(xml, "Welcome back") || hasResource(xml, "login-dev-bypass-toggle")) {
      const ok = await bypassLogin(xml);
      if (ok) {
        xml = dump("after-bypass");
        continue;
      }
    }
    if (
      hasResource(xml, "operations-admin-hub") ||
      hasText(xml, "Aagam Operations") ||
      hasText(xml, "Admin")
    ) {
      return xml;
    }
    console.log(`[ensureSignedIn] Waiting for hub (${attempt + 1}/15)...`);
    await sleep(3000);
    xml = dump(`wait-${attempt}`);
  }
  return xml;
}

async function openAiPackageWizard() {
  const deep = `exp+aagam-staff://admin/ai-wizards?target=tourPackage`;
  adb(`shell am start -a android.intent.action.VIEW -d "${deep}"`);
  await sleep(5000);
  let xml = dump("ai-wizards");
  for (let i = 0; i < 10; i++) {
    if (hasResource(xml, "ai-wizards-screen") || hasText(xml, "AI Package Wizard")) return xml;
    if (hasText(xml, "Connect")) xml = await connectDevClientToMetro(xml);
    await sleep(2000);
    xml = dump(`ai-wait-${i}`);
  }
  return xml;
}

async function pickFirstLocation(xml) {
  if (!tapResource(xml, "ai-location-picker") && !tapText(xml, "Location")) {
    throw new Error("Could not open location picker");
  }
  await sleep(1500);
  xml = dump("location-sheet");
  // Prefer first real location option after sheet opens
  const optionRe = /resource-id="ai-location-sheet-option-[^"]*"[^>]*bounds="([^"]+)"/;
  const m = optionRe.exec(xml);
  if (m) {
    const c = center(m[1]);
    if (c) {
      tap(c[0], c[1]);
      await sleep(1000);
      return dump("location-picked");
    }
  }
  // Fallback: tap a mid-list row
  tap(540, 900);
  await sleep(1000);
  return dump("location-picked-fallback");
}

async function generateAndCreate() {
  let xml = await openAiPackageWizard();
  if (hasResource(xml, "ai-target-package")) {
    tapResource(xml, "ai-target-package");
    await sleep(500);
    xml = dump("target-package");
  }

  xml = await pickFirstLocation(xml);

  // Ensure nights/days are set (defaults usually ok)
  if (hasResource(xml, "ai-generate")) {
    if (!tapResource(xml, "ai-generate")) throw new Error("Could not tap Generate");
  } else if (!tapText(xml, "Generate")) {
    throw new Error("Generate button not found");
  }

  console.log("[generate] Waiting for AI draft...");
  let review = null;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    xml = dump(`gen-${i}`);
    if (hasResource(xml, "ai-review-panel") || hasResource(xml, "ai-create-new")) {
      review = xml;
      break;
    }
    if (hasResource(xml, "ai-wizards-error") || hasResource(xml, "ai-retry-generate")) {
      const err = xml.match(/text="([^"]{10,200})"/);
      throw new Error(`AI generation failed: ${err?.[1] ?? "unknown"}`);
    }
    console.log(`[generate] still waiting (${i + 1}/60)...`);
  }
  if (!review) throw new Error("Timed out waiting for AI review panel");

  const draftHasDay =
    hasText(review, "Day 1") ||
    hasResource(review, "ai-day-1-toggle") ||
    /Day\s*1/i.test(review);
  if (!draftHasDay) {
    throw new Error("Review draft did not show Day 1 itinerary");
  }
  console.log("[generate] Draft shows itinerary ✓");

  if (!tapResource(review, "ai-create-new") && !tapText(review, "Create new package")) {
    // Scroll to actions
    adb("shell input swipe 540 1600 540 700 300");
    await sleep(800);
    review = dump("review-scrolled");
    if (!tapResource(review, "ai-create-new") && !tapText(review, "Create new package")) {
      throw new Error("Could not tap Create new package");
    }
  }

  console.log("[create] Opened package form — checking itinerary...");
  await sleep(4000);

  // Dismiss "Loaded itinerary from AI Wizard" alert if present
  let form = dump("package-form");
  if (hasText(form, "AI Wizard") || hasText(form, "Loaded itinerary")) {
    tapText(form, "OK") || tapText(form, "ok") || tap(540, 1200);
    await sleep(1000);
    form = dump("package-form-after-alert");
  }

  for (let i = 0; i < 8; i++) {
    if (
      hasResource(form, "tour-package-form-itinerary") ||
      hasResource(form, "tour-package-day-1") ||
      hasResource(form, "tour-package-day-title-1")
    ) {
      break;
    }
    adb("shell input swipe 540 1600 540 700 300");
    await sleep(800);
    form = dump(`form-scroll-${i}`);
  }

  const hasDay1 =
    hasResource(form, "tour-package-day-1") ||
    hasResource(form, "tour-package-day-title-1") ||
    hasText(form, "Day 1");

  if (!hasDay1) {
    throw new Error(
      "FAIL: Create package form has no itinerary day after AI draft handoff"
    );
  }

  console.log("PASS: Create package form retained Day 1 itinerary from AI draft");
  return true;
}

async function main() {
  console.log(`Device check — staff Metro :${PORT}, API :3000`);
  const devices = adb("devices");
  if (!devices.includes("\tdevice")) throw new Error("No adb device connected");
  await ensureSignedIn();
  await generateAndCreate();
}

main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});
