/**
 * USB smoke test: launch variant, dev-bypass sign-in, capture key UI labels.
 * Usage: node scripts/adb-test-variant.mjs public|staff|finance
 */
import { execSync } from "node:child_process";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const variant = process.argv[2];
const configs = {
  public: {
    label: "Aagam Holidays",
    pkg: "com.aagamholidays.app",
    activity: "com.aagamholidays.app/.MainActivity",
    scheme: "exp+aagam-holidays",
    postLogin: ["home-screen", "Discover your next trip", "tab-home"],
  },
  staff: {
    label: "Aagam Operations",
    pkg: "com.aagamholidays.staff",
    activity: "com.aagamholidays.staff/com.aagamholidays.app.MainActivity",
    scheme: "exp+aagam-staff",
    postLogin: [
      "operations-admin-hub",
      "operations-hub-header",
      "Operations",
      "Dashboard",
      "admin-hub-section-dashboard",
    ],
  },
  finance: {
    label: "Aagam Accounts",
    pkg: "com.aagamholidays.finance",
    activity: "com.aagamholidays.finance/com.aagamholidays.app.MainActivity",
    scheme: "exp+aagam-finance",
    postLogin: ["finance-sign-in-required", "Sign in required", "admin/finance"],
  },
};

const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";

function adb(cmd) {
  return execSync(`adb ${cmd}`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
}

function dump(tag) {
  adb("shell uiautomator dump /sdcard/ui.xml");
  const xml = adb("shell cat /sdcard/ui.xml");
  console.log(`[${tag}] dump ok (${xml.length} bytes)`);
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
  const re = new RegExp(`resource-id="${id}"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`);
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}

function hasText(xml, text) {
  return xml.includes(`text="${text}"`) || xml.includes(`>${text}<`);
}

function bypassLogin(xml) {
  if (hasText(xml, "Developer sign-in (bypass Clerk)")) {
    tap(540, 1720);
  } else if (!tapResource(xml, "login-dev-bypass-toggle")) {
    return false;
  }
  const form = dump("bypass-form");
  if (!tapResource(form, "login-dev-bypass-token")) tap(540, 1050);
  for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
  for (const ch of BYPASS) {
    if (ch === "-") adb('shell input text "-"');
    else adb(`shell input text "${ch}"`);
  }
  const filled = dump("bypass-filled");
  if (!tapResource(filled, "login-dev-bypass-continue")) {
    if (!hasText(filled, "Continue with bypass token")) return false;
    tap(540, 1280);
  }
  return true;
}

async function main() {
  const cfg = configs[variant];
  if (!cfg) {
    console.error("Usage: node scripts/adb-test-variant.mjs public|staff|finance");
    process.exit(1);
  }

  const port = metroPortForVariant(variant);
  console.log(`\n=== ${variant.toUpperCase()} (${cfg.label}) — Metro :${port} ===\n`);
  adb(`reverse tcp:${port} tcp:${port}`);
  adb("reverse tcp:3000 tcp:3000");

  const url = encodeURIComponent(`http://127.0.0.1:${port}`);
  adb(`shell am force-stop ${cfg.pkg}`);
  adb(
    `shell am start -a android.intent.action.VIEW -d "${cfg.scheme}://expo-development-client/?url=${url}" ${cfg.pkg}`
  );
  await new Promise((r) => setTimeout(r, 20000));

  let xml = dump("launched");
  if (hasText(xml, cfg.label) || hasText(xml, "Development Build")) {
    console.log(`OK: Dev launcher shows app name "${cfg.label}"`);
  }

  if (hasText(xml, "Connect") || hasText(xml, "DEVELOPMENT SERVERS")) {
    tap(540, 680);
    await new Promise((r) => setTimeout(r, 15000));
    xml = dump("after-connect");
  }

  if (hasText(xml, "Reload") || hasText(xml, "Go home")) {
    tap(954, 1097);
    await new Promise((r) => setTimeout(r, 3000));
    xml = dump("after-devmenu-close");
  }

  if (variant === "staff" && hasText(xml, "Admin access required")) {
    tap(540, 1245);
    await new Promise((r) => setTimeout(r, 3000));
    xml = dump("staff-signin");
  }
  if (variant === "finance" && hasText(xml, "Sign in required")) {
    tap(540, 620);
    await new Promise((r) => setTimeout(r, 3000));
    xml = dump("finance-signin");
  }
  if (variant === "public" && hasText(xml, "profile-guest-view")) {
    tapResource(xml, "login-button");
    await new Promise((r) => setTimeout(r, 3000));
    xml = dump("public-signin");
  }

  if (hasText(xml, "login-screen") || hasText(xml, "Welcome back")) {
    adb("shell input swipe 540 1300 540 700 300");
    await new Promise((r) => setTimeout(r, 800));
    xml = dump("login-scrolled");
    if (!bypassLogin(xml)) {
      console.error("FAIL: could not complete dev bypass login");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 12000));
    xml = dump("after-bypass");
  }

  if (variant === "staff" && !hasText(xml, "Operations") && !xml.includes("operations-admin-hub")) {
    if (tapResource(xml, "tab-admin-icon")) {
      await new Promise((r) => setTimeout(r, 4000));
      xml = dump("staff-menu-tab");
    } else if (hasText(xml, "Menu")) {
      const menuRe = /text="Menu"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/;
      const mm = menuRe.exec(xml);
      if (mm) {
        const c = center(mm[1]);
        if (c) {
          tap(c[0], c[1]);
          await new Promise((r) => setTimeout(r, 4000));
          xml = dump("staff-menu-tab-text");
        }
      }
    }
  }

  const hits = cfg.postLogin.filter((k) => xml.includes(k) || hasText(xml, k));
  if (hits.length) {
    console.log(`OK: post-login markers: ${hits.join(", ")}`);
  } else {
    console.warn("WARN: expected post-login UI not found; check device screen");
    console.log("Sample texts:", [...xml.matchAll(/text="([^"]{4,})"/g)].slice(0, 15).map((m) => m[1]));
  }

  console.log(`\n=== ${variant} done ===\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
