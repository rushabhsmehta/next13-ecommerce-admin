/**
 * Full E2E: Operations hub → AI wizard → Create package → Save → verify itinerary.
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
  return null;
}

const ADB = resolveAdb();
function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dump(tag) {
  for (let i = 0; i < 4; i++) {
    try {
      adb("shell uiautomator dump /sdcard/ui.xml");
      const xml = adb("shell cat /sdcard/ui.xml");
      if (xml && xml.length > 200) {
        writeFileSync(`ui_e2e_${tag}.xml`, xml);
        console.log(`[${tag}] ${xml.length}b`);
        return xml;
      }
    } catch (e) {
      console.log(`[${tag}] dump retry ${i}: ${e.message?.slice(0, 80)}`);
      sleep(800);
    }
  }
  throw new Error(`dump failed: ${tag}`);
}

function center(b) {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(b);
  if (!m) return null;
  return [Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2)];
}
function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}
function tapResource(xml, id) {
  const re = new RegExp(`resource-id="${id}"[^>]*bounds="([^"]+)"`);
  const m = re.exec(xml) || new RegExp(`bounds="([^"]+)"[^>]*resource-id="${id}"`).exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}
function tapText(xml, text) {
  const re = new RegExp(`text="${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*bounds="([^"]+)"`, "i");
  const m = re.exec(xml);
  if (!m) return false;
  const c = center(m[1]);
  if (!c) return false;
  tap(c[0], c[1]);
  return true;
}
function scrollDown() {
  adb("shell input swipe 540 1900 540 700 280");
}

async function main() {
  console.log("E2E AI package create");
  adb(`reverse tcp:${PORT} tcp:${PORT}`);
  adb("reverse tcp:3000 tcp:3000");
  adb("shell input keyevent KEYCODE_WAKEUP");
  adb("shell settings put system screen_off_timeout 600000");

  adb(`shell am force-stop ${PKG}`);
  await sleep(800);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(10000);

  let xml = dump("hub");
  if (!tapText(xml, "Tour packages")) throw new Error("Tour packages tile missing");
  await sleep(3000);
  xml = dump("list");

  // Prefer AI wizard deep link for reliability
  adb(
    `shell am start -a android.intent.action.VIEW -d "exp+aagam-staff://admin/ai-wizards?target=tourPackage"`
  );
  await sleep(4000);
  xml = dump("wizard");
  if (!xml.includes("AI Package Wizard") && !xml.includes("ai-wizards-screen")) {
    throw new Error("AI wizard did not open");
  }

  for (let i = 0; i < 7; i++) {
    if (tapResource(xml, "ai-generate")) break;
    scrollDown();
    await sleep(600);
    xml = dump(`to-gen-${i}`);
    if (i === 6) throw new Error("Generate not found");
  }
  console.log("generating…");

  let review = null;
  for (let i = 0; i < 40; i++) {
    await sleep(4000);
    xml = dump(`gen-${i}`);
    if (
      xml.includes("ai-create-new") ||
      xml.includes("Itinerary preview") ||
      xml.includes("ai-review-panel")
    ) {
      review = xml;
      break;
    }
    if (xml.includes("Generation failed")) throw new Error("AI generation failed");
    console.log(`wait ${i}`);
  }
  if (!review) throw new Error("No review");
  if (!/Day\s*1/i.test(review)) throw new Error("Draft missing Day 1");
  console.log("draft Day 1 OK");

  let created = false;
  for (let i = 0; i < 8; i++) {
    xml = dump(`precreate-${i}`);
    if (tapResource(xml, "ai-create-new") || tapText(xml, "Create new package")) {
      created = true;
      break;
    }
    scrollDown();
    await sleep(600);
  }
  if (!created) throw new Error("Create new package not found");
  console.log("create tapped — waiting for form");

  let formXml = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    xml = dump(`form-${i}`);
    if (tapText(xml, "OK") || tapText(xml, "Ok")) {
      await sleep(800);
      continue;
    }
    const onForm =
      xml.includes("tour-package-form") ||
      xml.includes("tour-package-new-screen") ||
      xml.includes("New package") ||
      xml.includes("Create package");
    const hasDay =
      xml.includes("tour-package-day-1") ||
      xml.includes("tour-package-day-title-1") ||
      xml.includes("tour-package-form-itinerary");
    console.log(`form ${i}: len=${xml.length} onForm=${onForm} hasDay=${hasDay}`);
    if (hasDay) {
      formXml = xml;
      break;
    }
    if (onForm) {
      scrollDown();
    }
  }
  if (!formXml) throw new Error("FAIL: form opened without itinerary days");

  let hasAct = false;
  for (let i = 0; i < 10; i++) {
    if (
      formXml.includes("tour-package-day-1-activity") ||
      /Activities \([1-9]/.test(formXml)
    ) {
      hasAct = true;
      break;
    }
    scrollDown();
    await sleep(600);
    formXml = dump(`acts-${i}`);
  }
  console.log(`form itinerary OK; activities=${hasAct}`);

  let saved = false;
  for (let i = 0; i < 6; i++) {
    xml = dump(`save-${i}`);
    if (tapText(xml, "Create package")) {
      saved = true;
      break;
    }
    adb("shell input swipe 540 700 540 1800 250");
    await sleep(400);
  }
  if (!saved) {
    tap(540, 2280);
    console.log("save fallback");
  }
  console.log("saving…");
  await sleep(8000);

  let detailOk = false;
  for (let i = 0; i < 12; i++) {
    xml = dump(`detail-${i}`);
    if (xml.includes("Save failed")) throw new Error("Save failed");
    if (/Day\s*1/i.test(xml) || xml.includes("Itinerary (")) {
      detailOk = true;
      break;
    }
    scrollDown();
    await sleep(500);
  }
  if (!detailOk) throw new Error("FAIL: detail missing itinerary after save");

  console.log(
    `PASS: AI package created with itinerary${hasAct ? " and activities" : " (activities not visible in dump)"}`
  );
}

main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});
