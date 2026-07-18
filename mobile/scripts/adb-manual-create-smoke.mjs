import { execSync } from "node:child_process";

const PKG = "com.aagamholidays.staff";
function adb(cmd) {
  return execSync(`adb ${cmd}`, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function dump() {
  adb("shell uiautomator dump /sdcard/ui.xml");
  return adb("shell cat /sdcard/ui.xml");
}
function tapText(xml, text) {
  const re = new RegExp(
    `text="${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*bounds="([^"]+)"`,
    "i"
  );
  const m = re.exec(xml);
  if (!m) return false;
  const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  if (!b) return false;
  adb(`shell input tap ${Math.floor((+b[1] + +b[3]) / 2)} ${Math.floor((+b[2] + +b[4]) / 2)}`);
  return true;
}

async function main() {
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(8000);
  let xml = dump();
  console.log("tap packages", tapText(xml, "Tour packages"));
  await sleep(3500);
  xml = dump();
  console.log("tap New", tapText(xml, "New"));
  await sleep(2000);
  xml = dump();
  console.log(
    "alert texts",
    [...xml.matchAll(/text="([^"]{2,40})"/g)].slice(0, 12).map((m) => m[1])
  );
  console.log("tap Manual", tapText(xml, "Manual"));
  await sleep(6000);
  const focus = adb("shell dumpsys window")
    .split("\n")
    .find((l) => l.includes("mCurrentFocus"));
  console.log(focus);
  xml = dump();
  console.log("len", xml.length);
  console.log(
    "texts",
    [...xml.matchAll(/text="([^"]{2,50})"/g)].slice(0, 20).map((m) => m[1])
  );
  console.log(
    "ids",
    [...xml.matchAll(/resource-id="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((id) => /tour-package|permission/.test(id))
      .slice(0, 15)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
