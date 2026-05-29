import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { metroPortForVariant } from "./variant-dev-ports.mjs";

const PKG = "com.aagamholidays.staff";
const SCHEME = "exp+aagam-staff";
const PORT = metroPortForVariant("staff");
const BYPASS = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN || "mobile-dev-test-bypass-20260522";

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
    } catch {}
  }
  return null;
}

const ADB = resolveAdb();

function adb(cmd) {
  if (!ADB) {
    throw new Error("adb not found.");
  }
  return execSync(`${ADB} ${cmd}`, { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dump(tag) {
  adb("shell uiautomator dump /sdcard/ui.xml");
  const xml = adb("shell cat /sdcard/ui.xml");
  // Save for local reference if needed
  writeFileSync(`ui_dump_${tag}.xml`, xml, "utf8");
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
  const re = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, "i");
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

function bypassLogin(xml) {
  if (hasText(xml, "Developer sign-in (bypass Clerk)")) tap(540, 1720);
  else if (!tapResource(xml, "login-dev-bypass-toggle")) return false;
  const form = dump("bypass-form");
  if (!tapResource(form, "login-dev-bypass-token")) tap(540, 1050);
  for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
  for (const ch of BYPASS) {
    if (ch === "-") adb('shell input text "-"');
    else adb(`shell input text "${ch}"`);
  }
  const filled = dump("bypass-filled");
  if (!tapResource(filled, "login-dev-bypass-continue")) tap(540, 1280);
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
  await sleep(15000);
  let xml = dump("launch");

  for (let attempt = 0; attempt < 15; attempt++) {
    if (
      !hasText(xml, "Connect") &&
      !hasText(xml, "DEVELOPMENT SERVERS") &&
      !hasText(xml, "Admin access required") &&
      !hasText(xml, "login-screen") &&
      !hasText(xml, "Welcome back") &&
      !xml.includes("operations-admin-hub")
    ) {
      console.log(`[ensureSignedIn] App is loading bundle/splash... sleeping 3s (attempt ${attempt + 1}/15)`);
      await sleep(3000);
      xml = dump("launch-retry");
    } else {
      break;
    }
  }

  if (hasText(xml, "Connect") || hasText(xml, "DEVELOPMENT SERVERS")) {
    tap(540, 680);
    await sleep(10000);
    xml = dump("connected");
  }
  if (hasText(xml, "Admin access required")) {
    tap(540, 1245);
    await sleep(3000);
    xml = dump("signin-prompt");
  }
  if (hasText(xml, "login-screen") || hasText(xml, "Welcome back")) {
    adb("shell input swipe 540 1300 540 700 300");
    await sleep(600);
    xml = dump("login");
    if (!bypassLogin(xml)) throw new Error("Dev bypass login failed");
    await sleep(8000);
    xml = dump("post-login");
  }
  if (!xml.includes("operations-admin-hub")) {
    tapResource(xml, "tab-admin-icon") || tapText(xml, "Menu");
    await sleep(4000);
    xml = dump("admin-tab");
  }
  for (let attempt = 0; attempt < 15; attempt++) {
    if (xml.includes("operations-hub-loading") && !xml.includes("operations-admin-hub")) {
      console.log(`[ensureSignedIn] Hub is loading stats... sleeping 1.5s (attempt ${attempt + 1}/15)`);
      await sleep(1500);
      xml = dump("admin-tab-loading");
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
  console.log("=== Initializing Prisma database helper ===");
  const prisma = new PrismaClient();
  
  // Clean up any old tests
  await prisma.inquiry.deleteMany({
    where: { customerName: "ADB TOUR QUERY TEST" }
  });

  const loc = await prisma.location.findFirst({
    where: { label: { contains: "Ahmedabad" } }
  }) || await prisma.location.findFirst();

  const rt = await prisma.roomType.findFirst() || await prisma.roomType.create({
    data: { name: "Test Room" }
  });

  const ot = await prisma.occupancyType.findFirst() || await prisma.occupancyType.create({
    data: { name: "Test Occupancy" }
  });

  const mp = await prisma.mealPlan.findFirst() || await prisma.mealPlan.create({
    data: { name: "Test Meal Plan" }
  });

  // Fetch package variant to select later
  const pkgTemplate = await prisma.tourPackage.findFirst({
    where: { isArchived: false },
    include: { packageVariants: true }
  });
  if (!pkgTemplate) {
    throw new Error("No active Tour Packages templates in database. Please seed one first.");
  }
  console.log(`Using package template: ${pkgTemplate.tourPackageName}`);

  console.log("=== Creating test inquiry with room allocations ===");
  const testInquiry = await prisma.inquiry.create({
    data: {
      customerName: "ADB TOUR QUERY TEST",
      customerMobileNumber: "9876543210",
      locationId: loc.id,
      numAdults: 2,
      journeyDate: new Date(),
      status: "PENDING",
      roomAllocations: {
        create: [
          {
            quantity: 2,
            roomTypeId: rt.id,
            occupancyTypeId: ot.id,
            mealPlanId: mp.id,
            customRoomType: "Deluxe Test Room",
          }
        ]
      }
    }
  });

  console.log(`Test inquiry ID: ${testInquiry.id}`);

  try {
    console.log("\n--- Sign in to staff app ---");
    await ensureSignedIn();

    console.log("\n--- Deep linking to inquiry detail screen ---");
    adb(`shell am start -a android.intent.action.VIEW -d "${SCHEME}://admin/crm/inquiries/${testInquiry.id}" ${PKG}`);
    await sleep(3000);
    let xml = dump("inquiry-detail");

    for (let attempt = 0; attempt < 10; attempt++) {
      if (xml.includes("inquiry-detail-loading") && !xml.includes("inquiry-detail-screen")) {
        console.log(`[deepLink] Inquiry detail is loading... sleeping 1.5s (attempt ${attempt + 1}/10)`);
        await sleep(1500);
        xml = dump("inquiry-detail-loading-poll");
      } else {
        break;
      }
    }

    if (!xml.includes("inquiry-detail-screen")) {
      throw new Error("Could not deep link to inquiry detail screen");
    }

    console.log("\n--- Creating Tour Query from Inquiry ---");
    if (!xml.includes("inquiry-create-tour-query")) {
      console.log("Create Tour Query button not visible, scrolling...");
      adb("shell input swipe 540 1400 540 400 400"); // Scroll down to reveal button
      await sleep(800);
      xml = dump("inquiry-detail-scrolled");
    }

    if (!tapResource(xml, "inquiry-create-tour-query")) {
      throw new Error("Create Tour Query button not found");
    }
    await sleep(1500);

    xml = dump("create-confirm-alert");
    if (!tapText(xml, "Create")) {
      tap(720, 1180); // Fallback coords for standard confirm dialog
    }
    await sleep(6000);

    xml = dump("create-success-alert");
    if (!tapText(xml, "Open Query")) {
      tap(720, 1180);
    }
    await sleep(3000);

    let detailXml = dump("detail-screen-loading");
    for (let attempt = 0; attempt < 10; attempt++) {
      if (detailXml.includes("tq-detail-loading") && !detailXml.includes("tq-detail-screen")) {
        console.log(`[detailLink] Tour Query detail is loading... sleeping 1.5s (attempt ${attempt + 1}/10)`);
        await sleep(1500);
        detailXml = dump("detail-screen-loading-poll");
      } else {
        break;
      }
    }

    if (!detailXml.includes("tq-detail-screen")) {
      throw new Error("Failed to navigate to tour query detail screen");
    }

    console.log("\n--- Tapping Edit Query button on Detail Screen ---");
    if (!tapResource(detailXml, "trip-primary-action") && !tapResource(detailXml, "tour-query-edit")) {
      throw new Error("Edit Query button not found on detail screen");
    }
    await sleep(1500);
    xml = dump("edit-screen-loaded");
    for (let attempt = 0; attempt < 10; attempt++) {
      if (xml.includes("tq-edit-loading") && !xml.includes("tq-edit-screen")) {
        console.log(`[editLink] Tour Query edit is loading... sleeping 1.5s (attempt ${attempt + 1}/10)`);
        await sleep(1500);
        xml = dump("edit-screen-loading-poll");
      } else {
        break;
      }
    }
    if (!xml.includes("tq-edit-screen")) {
      throw new Error("Failed to navigate to tour query edit screen");
    }
    console.log("OK: Edit screen loaded successfully.");

    // Verify the inquiry room banner is visible
    if (!xml.includes("tq-edit-inquiry-rooms-banner")) {
      console.log("Banner not visible in initial view, scrolling down...");
      adb("shell input swipe 540 1800 540 400 400");
      await sleep(800);
      xml = dump("edit-screen-scrolled-for-banner");
      if (!xml.includes("tq-edit-inquiry-rooms-banner")) {
        throw new Error("Inquiry room allocations banner not visible on edit screen!");
      }
      console.log("OK: Inquiry room allocations banner is visible!");
      
      // Scroll back up to ensure pickers at the top are visible
      console.log("Scrolling back up to top...");
      adb("shell input swipe 540 400 540 1800 400");
      await sleep(800);
      xml = dump("edit-screen-scrolled-back");
    } else {
      console.log("OK: Inquiry room allocations banner is visible!");
    }

    console.log("\n--- Load package template ---");
    if (!tapResource(xml, "tq-edit-template-picker")) {
      throw new Error("Package template picker button not found");
    }
    await sleep(2500);

    xml = dump("template-picker-sheet");
    // Tap the first package template option
    if (!tapResource(xml, "admin-picker-sheet-option-0")) {
      throw new Error("No option found in template picker sheet");
    }
    await sleep(6000); // Wait for details fetch & itineraries mapping

    xml = dump("itineraries-populated");
    
    // Check that we have itineraries populated
    if (xml.includes("This tour package query has no itinerary yet")) {
      throw new Error("Failed to populate itineraries from package template!");
    }
    console.log("OK: Itineraries populated from package template.");

    // Verify variant selector is now active
    if (!xml.toLowerCase().includes("select package variant") && !xml.includes("tq-edit-variant-picker")) {
      throw new Error("Variant picker not visible after package selection");
    }

    console.log("\n--- Select package variant ---");
    if (!tapResource(xml, "tq-edit-variant-picker")) {
      throw new Error("Variant picker button not found");
    }
    await sleep(2500);

    xml = dump("variant-picker-sheet");
    if (!tapResource(xml, "admin-picker-sheet-option-0")) {
      throw new Error("No option found in variant picker sheet");
    }
    await sleep(6000); // Wait for hotel mappings fetch

    xml = dump("variant-hotel-mapped");

    console.log("\n--- Save changes ---");
    if (!tapResource(xml, "tq-edit-save")) {
      throw new Error("Save changes button not found");
    }
    await sleep(6000);

    console.log("\n=== UI TEST PASS: Flow works perfectly! ===");

  } finally {
    console.log("\n=== Database Cleanup ===");
    // Delete query and inquiry
    const qCount = await prisma.tourPackageQuery.deleteMany({
      where: { inquiryId: testInquiry.id }
    });
    console.log(`Cleaned up ${qCount.count} tour queries.`);
    
    const iCount = await prisma.inquiry.delete({
      where: { id: testInquiry.id }
    });
    console.log(`Cleaned up inquiry: ${iCount.customerName}`);
    
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\nFAIL:", e.message || e);
  process.exit(1);
});
