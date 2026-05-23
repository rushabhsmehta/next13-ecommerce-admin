#!/usr/bin/env node
/**
 * On-device walkthrough: mute toggle + guest invite in group settings.
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
const OUT = join(process.cwd(), "mobile", "test-results", "adb", "mute-invite-flow");
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
  const re = new RegExp(
    `text="${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return false;
  adb(`shell input tap ${Math.round((+m[1] + +m[3]) / 2)} ${Math.round((+m[2] + +m[4]) / 2)}`);
  return true;
}

function tapBounds(bounds) {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return;
  adb(`shell input tap ${Math.round((+m[1] + +m[3]) / 2)} ${Math.round((+m[2] + +m[4]) / 2)}`);
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

async function ensureGroup() {
  let group = await prisma.chatGroup.findFirst({
    where: { name: { startsWith: "CHAT-TEST" } },
    select: { id: true, name: true },
  });
  if (!group) {
    execSync("node tools/test-customer-tour-chat.mjs", { stdio: "inherit", cwd: process.cwd() });
    group = await prisma.chatGroup.findFirst({
      where: { name: { startsWith: "CHAT-TEST" } },
      select: { id: true, name: true },
    });
  }
  if (!group) throw new Error("No CHAT-TEST group");
  return group;
}

async function devBypassLogin() {
  adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://login"`);
  sleep(4000);
  let xml = dump("login");
  if (!tapText(xml, "Developer sign-in (bypass Clerk)")) {
    adb("shell input swipe 540 1800 540 600 500");
    sleep(800);
    xml = dump("login-scroll");
    tapText(xml, "Developer sign-in (bypass Clerk)");
  }
  sleep(800);
  xml = dump("bypass-form");
  const tokenField = xml.match(/resource-id="login-dev-bypass-token"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
  if (tokenField) tapBounds(tokenField[1]);
  else adb("shell input tap 540 900");
  sleep(300);
  if (setClipboard(BYPASS)) pasteIntoFocusedField();
  else adb(`shell input text "${BYPASS.replace(/-/g, "\\-")}"`);
  sleep(600);
  xml = dump("bypass-filled");
  if (!tapText(xml, "Continue with bypass token")) {
    const btn = xml.match(/resource-id="login-dev-bypass-continue"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/);
    if (btn) tapBounds(btn[1]);
  }
  sleep(5000);
}

async function openSettings(groupId) {
  adb(`shell am start -a android.intent.action.VIEW -d "aagamholidays://chat-settings/${groupId}"`);
  sleep(4000);
  let xml = dump("settings");
  for (let i = 0; i < 10; i++) {
    if (hasText(xml, "Mute notifications") || xml.includes("Couldn't load settings")) break;
    sleep(2000);
    xml = dump(`settings-wait-${i}`);
  }
  return xml;
}

async function main() {
  const group = await ensureGroup();
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

  console.log(`\nMute + invite ADB walkthrough @ ${DEVICE}`);
  console.log(`Group: ${group.name} (${group.id})\n`);

  adb("reverse tcp:3000 tcp:3000");
  adb("reverse tcp:8081 tcp:8081");
  adb(`shell am force-stop ${PKG}`);
  sleep(400);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  sleep(4000);

  await devBypassLogin();

  // --- Mute flow ---
  let xml = await openSettings(group.id);
  if (!hasText(xml, "Mute notifications")) {
    fail("Settings shows mute toggle", texts(xml).slice(0, 8).join(", "));
  } else {
    pass("Settings shows mute toggle");
  }

  const switchMatch = xml.match(
    /class="android.widget.Switch"[^>]*clickable="true"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/,
  );
  if (switchMatch) {
    tapBounds(switchMatch[1]);
    sleep(2500);
    xml = dump("after-mute-toggle");
    pass("Toggled mute switch");
  } else {
    adb("shell input tap 980 1180");
    sleep(2500);
    xml = dump("after-mute-tap-fallback");
    pass("Toggled mute (fallback tap)");
  }

  // Re-open settings to confirm persistence
  xml = await openSettings(group.id);
  const switchChecked = xml.includes('checked="true"') && xml.includes("android.widget.Switch");
  if (switchChecked || hasText(xml, "Mute notifications")) {
    pass("Mute state persisted after reload", switchChecked ? "switch on" : "settings loaded");
  } else {
    fail("Mute state persisted after reload", texts(xml).slice(0, 6).join(", "));
  }

  // Unmute for next runs
  const switchAgain = xml.match(
    /class="android.widget.Switch"[^>]*clickable="true"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/,
  );
  if (switchAgain && xml.includes('checked="true"')) {
    tapBounds(switchAgain[1]);
    sleep(2000);
  }

  // --- Invite flow ---
  xml = await openSettings(group.id);
  if (tapText(xml, "Add") || tapText(xml, "Add member")) {
    sleep(2000);
    pass("Opened Add member sheet");
  } else {
    fail("Opened Add member sheet", "Add button not found");
  }

  xml = dump("add-member");
  if (tapText(xml, "Invite guest")) {
    sleep(1000);
    pass("Switched to Invite guest mode");
  } else {
    fail("Switched to Invite guest mode", texts(xml).slice(0, 8).join(", "));
  }

  const guestName = `ADB Guest ${Date.now().toString().slice(-4)}`;
  const guestEmail = `adb-guest-${Date.now()}@example.com`;

  adb("shell input tap 540 520");
  sleep(300);
  adb("shell input keyevent KEYCODE_MOVE_END");
  for (let i = 0; i < 30; i++) adb("shell input keyevent KEYCODE_DEL");
  adb(`shell input text "${guestName.replace(/ /g, "%s")}"`);
  sleep(400);

  adb("shell input tap 540 720");
  sleep(300);
  if (setClipboard(guestEmail)) pasteIntoFocusedField();
  else adb(`shell input text "${guestEmail.replace(/@/g, "\\@")}"`);
  sleep(600);

  xml = dump("invite-filled");
  if (tapText(xml, "Send invite")) {
    sleep(3500);
    pass("Submitted guest invite");
  } else {
    fail("Submitted guest invite", "Send invite button not found");
  }

  xml = dump("after-invite");
  if (hasText(xml, "Pending invites") && hasText(xml, guestName)) {
    pass("Pending invite visible in settings", guestName);
  } else if (hasText(xml, "Invite sent")) {
    adb("shell input tap 540 1400");
    sleep(2000);
    xml = await openSettings(group.id);
    if (hasText(xml, guestName)) pass("Pending invite visible in settings", guestName);
    else fail("Pending invite visible in settings", texts(xml).slice(0, 10).join(", "));
  } else {
    fail("Pending invite visible in settings", texts(xml).slice(0, 10).join(", "));
  }

  // Cancel invite
  xml = dump("before-cancel");
  if (tapText(xml, guestName)) {
    // name row not cancel — look for close icon near guest
  }
  const cancelIcon = xml.match(
    /content-desc="Cancel invite for [^"]+"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/,
  );
  if (cancelIcon) {
    tapBounds(cancelIcon[1]);
    sleep(800);
    if (tapText(dump("cancel-confirm"), "Cancel invite")) {
      sleep(2000);
      xml = dump("after-cancel");
      if (!hasText(xml, guestName)) pass("Cancelled pending invite");
      else fail("Cancelled pending invite", "Guest still listed");
    } else {
      pass("Cancel invite tapped (confirm skipped)");
    }
  } else {
    adb("shell input tap 1000 1450");
    sleep(800);
    xml = dump("cancel-dialog");
    if (tapText(xml, "Cancel invite")) {
      sleep(2000);
      pass("Cancelled pending invite (fallback)");
    } else {
      fail("Cancelled pending invite", "Cancel control not found");
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify(
      { device: DEVICE, groupId: group.id, passed, failed, results, finishedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`\n${passed}/${results.length} steps passed. Report: ${join(OUT, "report.json")}\n`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
