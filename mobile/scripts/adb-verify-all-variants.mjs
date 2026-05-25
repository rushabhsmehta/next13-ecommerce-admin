/**
 * USB layout smoke test for all three app variants.
 * Requires matching Metro: run one variant at a time, or call with VARIANT=public|staff|finance
 *
 * Usage:
 *   node scripts/adb-verify-all-variants.mjs          # runs public → staff → finance (restarts metro)
 *   VARIANT=staff node scripts/adb-verify-all-variants.mjs  # single variant only
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const MOBILE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";
const ONLY = process.env.VARIANT?.trim();

function adb(cmd) {
  return execSync(`adb ${cmd}`, { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
}

function dump() {
  adb("shell uiautomator dump /sdcard/ui-all.xml");
  return adb("shell cat /sdcard/ui-all.xml");
}

function has(xml, token) {
  return xml.includes(token) || xml.includes(`text="${token}"`) || xml.includes(`content-desc="${token}"`);
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
  const re = new RegExp(`resource-id="${id}"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`);
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}

function bypassLogin(xml) {
  if (has(xml, "Developer sign-in (bypass Clerk)")) tap(540, 1720);
  else if (!tapResource(xml, "login-dev-bypass-toggle")) return false;
  const form = dump();
  if (!tapResource(form, "login-dev-bypass-token")) tap(540, 1050);
  for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
  for (const ch of BYPASS) {
    if (ch === "-") adb('shell input text "-"');
    else adb(`shell input text "${ch}"`);
  }
  const filled = dump();
  if (!tapResource(filled, "login-dev-bypass-continue")) tap(540, 1280);
  return true;
}

function killMetroPorts() {
  for (const port of [8081, 8082, 8083]) {
    try {
      const out = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, { encoding: "utf8" });
      const line = out.split("\n").find((l) => l.includes("LISTENING"));
      if (!line) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid) execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } catch {
      /* no listener */
    }
  }
}

async function startMetro(variant) {
  const port = metroPortForVariant(variant);
  killMetroPorts();
  await delay(2000);
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", `start:${variant}`, "--", "--localhost"], {
      cwd: MOBILE_DIR,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buf = "";
    const timer = setTimeout(() => {
      child.unref?.();
      resolve(child);
    }, 90000);
    const onData = (chunk) => {
      buf += chunk.toString();
      if (buf.includes(`Waiting on http://localhost:${port}`)) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", reject);
  });
}

const VARIANTS = {
  public: {
    label: "Aagam Holidays",
    pkg: "com.aagamholidays.app",
    scheme: "exp+aagam-holidays",
    checks: (xml) => [
      has(xml, "home-screen") && "home-screen",
      has(xml, "Discover your next trip") && "Discover your next trip",
      (has(xml, "tab-home") || has(xml, "tab-home-icon")) && "home tab",
    ].filter(Boolean),
  },
  staff: {
    label: "Aagam Operations",
    pkg: "com.aagamholidays.staff",
    scheme: "exp+aagam-staff",
    checks: (xml) => [
      has(xml, "operations-admin-hub") && "operations-admin-hub",
      has(xml, "admin-hub-section-crm") && "CRM section",
      has(xml, "admin-hub-section-operations") && "Operations section",
      has(xml, "Menu") && "Menu tab",
    ].filter(Boolean),
  },
  finance: {
    label: "Aagam Accounts",
    pkg: "com.aagamholidays.finance",
    scheme: "exp+aagam-finance",
    checks: (xml) => {
      const signedOut = has(xml, "finance-sign-in-required") || has(xml, "Sign in required");
      const signedIn =
        has(xml, "accounts-admin-hub") ||
        has(xml, "accounts-hub-header") ||
        has(xml, "admin-hub-section-quick-actions");
      if (signedIn) return ["accounts card hub"];
      if (signedOut) return ["finance sign-in gate"];
      return [];
    },
  },
};

async function testVariant(key, metroChild) {
  const cfg = VARIANTS[key];
  console.log(`\n━━━ ${cfg.label} (${key}) ━━━`);

  const port = metroPortForVariant(key);
  adb(`reverse tcp:${port} tcp:${port}`);
  adb("reverse tcp:3000 tcp:3000");

  const url = encodeURIComponent(`http://127.0.0.1:${port}`);
  adb("shell am force-stop com.android.chrome");
  adb(`shell am force-stop ${cfg.pkg}`);
  adb(
    `shell am start -a android.intent.action.VIEW -d "${cfg.scheme}://expo-development-client/?url=${url}" ${cfg.pkg}`
  );
  await delay(22000);

  let xml = dump();
  if (xml.includes("com.android.chrome")) {
    adb("shell input keyevent 4");
    await delay(1500);
    adb(`shell monkey -p ${cfg.pkg} -c android.intent.category.LAUNCHER 1`);
    await delay(15000);
    xml = dump();
  }

  if (has(xml, "Connect") || has(xml, "DEVELOPMENT SERVERS")) {
    tap(540, 680);
    await delay(12000);
    xml = dump();
  }

  if (key === "staff" && has(xml, "Admin access required")) {
    tap(540, 1245);
    await delay(3000);
    xml = dump();
  }
  if (key === "finance" && has(xml, "Sign in required")) {
    tap(540, 620);
    await delay(3000);
    xml = dump();
  }

  if (has(xml, "login-screen") || has(xml, "Welcome back")) {
    adb("shell input swipe 540 1300 540 700 300");
    await delay(800);
    xml = dump();
    if (bypassLogin(xml)) {
      await delay(14000);
      xml = dump();
    }
  }

  if (key === "staff" && has(xml, "operations-hub-loading")) {
    await delay(12000);
    xml = dump();
  }

  if (key === "staff" && !has(xml, "operations-admin-hub")) {
    tapResource(xml, "tab-admin-icon") || (has(xml, "Menu") && tap(135, 2200));
    await delay(4000);
    xml = dump();
  }

  const hits = cfg.checks(xml);
  if (hits.length) {
    console.log(`PASS: ${hits.join(", ")}`);
    if (has(xml, cfg.label)) console.log(`PASS: launcher name "${cfg.label}"`);
    return { key, ok: true, hits };
  }

  const ids = [...xml.matchAll(/resource-id="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => id && !id.startsWith("android:") && !id.includes("action_bar"));
  console.log("FAIL: expected UI not found");
  console.log("Sample resource-ids:", [...new Set(ids)].slice(0, 12).join(", ") || "(none)");
  return { key, ok: false, hits: [] };
}

async function main() {
  const list = ONLY ? [ONLY] : ["public", "staff", "finance"];
  const results = [];

  for (const key of list) {
    if (!VARIANTS[key]) {
      console.error(`Unknown variant: ${key}`);
      process.exit(1);
    }
    let metro = null;
    const skipMetro = Boolean(ONLY) || process.env.SKIP_METRO_START === "1";
    if (!skipMetro) {
      console.log(`Starting Metro for ${key}…`);
      metro = await startMetro(key);
      await delay(3000);
    } else if (ONLY) {
      console.log(`Using existing Metro on :${metroPortForVariant(key)} for ${key}…`);
      await delay(1000);
    }
    results.push(await testVariant(key, metro));
    if (metro?.kill) {
      try {
        metro.kill();
      } catch {
        /* */
      }
      await delay(2000);
    }
  }

  console.log("\n━━━ Summary ━━━");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${VARIANTS[r.key].label}: ${r.ok ? r.hits.join(", ") : "FAILED"}`);
  }
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
