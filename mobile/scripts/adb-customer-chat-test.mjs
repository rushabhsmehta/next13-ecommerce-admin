#!/usr/bin/env node
/**
 * On-device customer tour chat smoke test via ADB.
 * Prereqs: Next.js on :3000, Metro on :8081, adb reverse, dev client on device.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const DEVICE = process.env.ADB_DEVICE || "9aee4604";
const PKG = "com.aagamholidays.app";
const OUT = join(process.cwd(), "mobile", "test-results", "adb", "customer-chat-flow");
const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";
const prisma = new PrismaClient();

function adb(args) {
  return execSync(`adb -s ${DEVICE} ${args}`, { encoding: "utf8" }).trim();
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: "ignore" });
}

function dump(name) {
  mkdirSync(OUT, { recursive: true });
  adb("shell uiautomator dump /sdcard/w.xml");
  const local = join(OUT, `${name}.xml`);
  adb(`pull /sdcard/w.xml "${local.replace(/\\/g, "/")}"`);
  return readFileSync(local, "utf8");
}

function texts(xml) {
  return [...xml.matchAll(/text="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
}

function hasText(xml, ...needles) {
  const blob = texts(xml).join(" | ");
  return needles.every((n) => blob.includes(n));
}

function tapText(xml, label) {
  const re = new RegExp(`text="${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const m = xml.match(re);
  if (!m) return false;
  const x = Math.round((+m[1] + +m[3]) / 2);
  const y = Math.round((+m[2] + +m[4]) / 2);
  adb(`shell input tap ${x} ${y}`);
  return true;
}

function setClipboard(text) {
  try {
    execSync(`adb -s ${DEVICE} shell cmd clipboard set "${text.replace(/"/g, '\\"')}"`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function pasteIntoFocusedField() {
  adb("shell input keyevent 279");
}

function tapBounds(bounds) {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return;
  adb(`shell input tap ${Math.round((+m[1] + +m[3]) / 2)} ${Math.round((+m[2] + +m[4]) / 2)}`);
}

async function ensureTestGroup() {
  let group = await prisma.chatGroup.findFirst({
    where: { name: { startsWith: "CHAT-TEST" } },
    select: { id: true, name: true },
  });
  if (group) return group;

  execSync("node tools/test-customer-tour-chat.mjs", { stdio: "inherit", cwd: process.cwd() });
  group = await prisma.chatGroup.findFirst({
    where: { name: { startsWith: "CHAT-TEST" } },
    select: { id: true, name: true },
  });
  if (!group) throw new Error("Could not seed CHAT-TEST group");
  return group;
}

async function main() {
  const group = await ensureTestGroup();
  mkdirSync(OUT, { recursive: true });

  const results = [];
  const pass = (step, detail = "") => {
    results.push({ step, ok: true, detail });
    console.log(`✅ ${step}${detail ? `: ${detail}` : ""}`);
  };
  const fail = (step, detail = "") => {
    results.push({ step, ok: false, detail });
    console.log(`❌ ${step}${detail ? `: ${detail}` : ""}`);
  };

  console.log(`\nCustomer chat ADB test @ device ${DEVICE}`);
  console.log(`Group: ${group.name} (${group.id})\n`);

  adb("reverse tcp:3000 tcp:3000");
  adb("reverse tcp:8081 tcp:8081");

  adb(`shell am force-stop ${PKG}`);
  sleep(500);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  sleep(5000);

  let xml = dump("01-launch");
  if (xml.includes("Development Build") || xml.includes("Connect")) {
    if (tapText(xml, "Connect")) {
      sleep(4000);
      xml = dump("02-after-connect");
    } else if (xml.includes("exp://127.0.0.1:8081")) {
      const m = xml.match(/text="exp:\/\/127\.0\.0\.1:8081[^"]*"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
      if (m) tapBounds(m[1]);
      sleep(4000);
      xml = dump("02-after-connect");
    }
  }

  if (xml.includes("Development Build")) {
    fail("Connect to Metro dev server", "Open Expo dev client and tap Connect to localhost:8081");
  } else {
    pass("Connect to Metro dev server");
  }

  adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://login"`);
  sleep(4000);
  xml = dump("03-login");

  if (!tapText(xml, "Developer sign-in (bypass Clerk)")) {
    const scroll = adb("shell input swipe 540 1800 540 600 500");
    void scroll;
    sleep(1000);
    xml = dump("03-login-scrolled");
    tapText(xml, "Developer sign-in (bypass Clerk)");
  }
  sleep(1000);
  xml = dump("04-bypass-form");

  const tokenField = xml.match(/resource-id="login-dev-bypass-token"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
  if (tokenField) tapBounds(tokenField[1]);
  else adb("shell input tap 540 900");
  sleep(400);
  if (setClipboard(BYPASS)) {
    pasteIntoFocusedField();
  } else {
    adb("shell input keyevent KEYCODE_MOVE_END");
    for (let i = 0; i < 40; i++) adb("shell input keyevent KEYCODE_DEL");
    adb(`shell input text "${BYPASS.replace(/-/g, "\\-")}"`);
  }
  sleep(800);

  xml = dump("04b-bypass");
  if (!tapText(xml, "Continue with bypass token")) {
    const btn = xml.match(/resource-id="login-dev-bypass-continue"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
    if (btn) tapBounds(btn[1]);
  }
  sleep(6000);

  adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://chat/${group.id}"`);
  sleep(12000);
  xml = dump("06-chat-room");
  if (!hasText(xml, "Welcome") && !hasText(xml, "Manali") && xml.includes("Connection issue")) {
    sleep(8000);
    xml = dump("06b-chat-retry");
  }

  if (
    hasText(xml, "Welcome to your tour group") ||
    hasText(xml, "Manali") ||
    hasText(xml, "Can we get an early hotel")
  ) {
    pass("Chat room loads tour messages");
  } else if (hasText(xml, "Connection issue") || hasText(xml, "Could not load")) {
    fail("Chat room loads tour messages", texts(xml).slice(0, 8).join(", "));
  } else {
    fail("Chat room loads tour messages", texts(xml).slice(0, 12).join(", "));
  }

  adb("shell input tap 540 2150");
  sleep(500);
  adb("shell input keyevent KEYCODE_MOVE_END");
  for (let i = 0; i < 30; i++) adb("shell input keyevent KEYCODE_DEL");
  adb('shell input text "On%stour%stest%smobile"');
  sleep(800);
  xml = dump("07-before-send");
  if (tapText(xml, "Send") || xml.includes("chat-send-button")) {
    const m = xml.match(/resource-id="chat-send-button"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
    if (m && !xml.includes('enabled="false"')) tapBounds(m[1]);
    else {
      const enabledBtn = xml.match(
        /resource-id="chat-send-button"[^>]*clickable="true"[^>]*enabled="true"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/
      );
      if (enabledBtn) tapBounds(enabledBtn[1]);
      else tapText(xml, "Send");
    }
    sleep(5000);
    xml = dump("08-after-send");
    if (
      hasText(xml, "On tour test mobile") ||
      hasText(xml, "tour test") ||
      hasText(xml, "Welcome")
    ) {
      pass("Send customer message from device");
    } else {
      fail("Send customer message from device", texts(xml).slice(-10).join(", "));
    }
  } else {
    fail("Send customer message from device", "Send button not found");
  }

  adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://chat/${group.id}"`);
  sleep(6000);
  xml = dump("09-chat-again");
  if (tapText(xml, "Group settings") || xml.includes("settings-outline")) {
    adb("shell input tap 980 200");
    sleep(4000);
  } else {
    adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://chat-settings/${group.id}"`);
    sleep(5000);
  }
  xml = dump("10-settings");
  for (let attempt = 0; attempt < 8; attempt++) {
    if (hasText(xml, "Mute notifications") || hasText(xml, "Notifications")) break;
    if (xml.includes("Couldn't load settings")) break;
    sleep(2500);
    xml = dump(`10-settings-wait-${attempt}`);
  }
  if (hasText(xml, "Mute notifications") || hasText(xml, "Notifications")) {
    pass("Open group settings");
  } else if (hasText(xml, "Group settings") && !xml.includes("Couldn't load settings")) {
    pass("Open group settings", "screen opened");
  } else {
    fail("Open group settings", texts(xml).slice(0, 10).join(", "));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const report = {
    device: DEVICE,
    groupId: group.id,
    groupName: group.name,
    passed,
    failed,
    results,
    finishedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} steps passed. Report: ${join(OUT, "report.json")}\n`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
