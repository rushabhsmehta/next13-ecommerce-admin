/**
 * Verify Operations card hub layout on USB device (staff variant, signed-in).
 * Usage: node scripts/adb-verify-operations-layout.mjs
 */
import { execSync } from "node:child_process";

function adb(cmd) {
  return execSync(`adb ${cmd}`, { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
}

function dump() {
  adb("shell uiautomator dump /sdcard/ui.xml");
  return adb("shell cat /sdcard/ui.xml");
}

const REQUIRED = [
  "operations-admin-hub",
  "admin-hub-section-crm",
  "admin-hub-section-master-data",
  "admin-hub-section-operations",
];

const REQUIRED_AFTER_EXTRA_SCROLL = ["admin-hub-section-settings"];

const OPTIONAL_LABELS = ["Operations", "Dashboard", "CRM", "Master data", "Menu"];

function has(xml, token) {
  return xml.includes(token);
}

async function main() {
  adb("reverse tcp:8081 tcp:8081");
  adb("reverse tcp:3000 tcp:3000");

  let xml = dump();
  if (!has(xml, "operations-admin-hub")) {
    console.log("Launching staff app…");
    adb("shell am force-stop com.aagamholidays.staff");
    const url = encodeURIComponent("http://127.0.0.1:8081");
    adb(
      `shell am start -a android.intent.action.VIEW -d "exp+aagam-staff://expo-development-client/?url=${url}" com.aagamholidays.staff`
    );
    await new Promise((r) => setTimeout(r, 25000));
    xml = dump();
  }

  if (has(xml, "operations-hub-loading")) {
    console.log("Waiting for hub to finish loading…");
    await new Promise((r) => setTimeout(r, 15000));
    xml = dump();
  }

  if (!has(xml, "tab-admin")) {
    const menuRe = /content-desc="tab-admin"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/;
    const m = menuRe.exec(xml);
    if (m) {
      const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
      if (b) adb(`shell input tap ${Math.floor((+b[1] + +b[3]) / 2)} ${Math.floor((+b[2] + +b[4]) / 2)}`);
      await new Promise((r) => setTimeout(r, 5000));
      xml = dump();
    }
  }

  adb("shell input swipe 540 500 540 1900 400");
  await new Promise((r) => setTimeout(r, 800));
  let xmlTop = dump();

  adb("shell input swipe 540 1900 540 500 400");
  await new Promise((r) => setTimeout(r, 1500));
  let xmlMid = dump();

  adb("shell input swipe 540 1900 540 500 400");
  await new Promise((r) => setTimeout(r, 1500));
  let xmlBottom = dump();
  xml = xmlTop + xmlMid + xmlBottom;

  const missing = REQUIRED.filter((id) => !has(xml, id));
  const missingSettings = REQUIRED_AFTER_EXTRA_SCROLL.filter((id) => !has(xml, id));
  const labels = OPTIONAL_LABELS.filter((t) => has(xml, `text="${t}"`) || has(xml, `>${t}<`));

  console.log("\n=== Operations layout verification ===\n");
  if (missing.length) {
    console.error("FAIL: missing testIDs:", missing.join(", "));
    const ids = [...xml.matchAll(/resource-id="(admin-hub[^"]+|operations[^"]+)"/g)].map((m) => m[1]);
    console.log("Found hub ids:", [...new Set(ids)].join(", ") || "(none)");
    process.exit(1);
  }
  if (missingSettings.length) {
    console.warn("WARN: not in tree (scroll on device):", missingSettings.join(", "));
  }
  console.log("OK: core sections:", REQUIRED.join(", "));
  if (has(xml, "admin-hub-section-dashboard")) console.log("OK: Dashboard section visible");
  console.log("OK: visible labels:", labels.length ? labels.join(", ") : "(check content-desc)");

  // Tap Inquiries card
  const inqRe = /resource-id="admin-hub-section-dashboard-item-inquiries"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/;
  const inq = inqRe.exec(xml);
  if (inq) {
    const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(inq[1]);
    if (b) {
      adb(`shell input tap ${Math.floor((+b[1] + +b[3]) / 2)} ${Math.floor((+b[2] + +b[4]) / 2)}`);
      await new Promise((r) => setTimeout(r, 5000));
      const after = dump();
      if (has(after, "inquir") || has(after, "Inquir")) {
        console.log("OK: Inquiries card navigates to inquiry list");
      } else {
        console.warn("WARN: Inquiries navigation unclear — check device");
      }
      adb("shell input keyevent 4");
    }
  } else {
    console.warn("WARN: Inquiries card not in viewport (scroll manually)");
  }

  console.log("\n=== Layout OK on device ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
