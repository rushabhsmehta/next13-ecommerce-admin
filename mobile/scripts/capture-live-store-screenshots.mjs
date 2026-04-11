import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const baseUrl = process.env.EXPO_CAPTURE_BASE_URL || "http://127.0.0.1:19006";
const outDir = path.resolve("mobile", "marketing", "live");
const profileDir = `C:/temp/codex-puppeteer-profile-${Date.now()}`;

const sets = [
  {
    key: "android-phone",
    width: 360,
    height: 640,
    dpr: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "android-tablet-7",
    width: 600,
    height: 960,
    dpr: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "android-tablet-10",
    width: 800,
    height: 1280,
    dpr: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "ios-iphone-6.9",
    width: 428,
    height: 926,
    dpr: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "ios-ipad-13",
    width: 1032,
    height: 1376,
    dpr: 2,
    isMobile: true,
    hasTouch: true,
  },
];

const routes = [
  { name: "01-home", path: "/", waitFor: "Popular Destinations" },
  { name: "02-explore", path: "/explore", waitFor: "Tour Packages" },
  {
    name: "03-goa-destination",
    path: "/destinations/16816acc-8583-4a3c-ab0b-fe19441d3c5c",
    waitFor: "Packages in Goa",
  },
  { name: "04-profile", path: "/profile", waitFor: "Push Notifications" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await fs.mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    `--user-data-dir=${profileDir}`,
  ],
});

for (const set of sets) {
  const setDir = path.join(outDir, set.key);
  await fs.mkdir(setDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({
    width: set.width,
    height: set.height,
    deviceScaleFactor: set.dpr,
    isMobile: set.isMobile,
    hasTouch: set.hasTouch,
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem(
      "user_data",
      JSON.stringify({
        name: "Aarav Shah",
        email: "aarav@aagamholidays.com",
      }),
    );
    localStorage.removeItem("auth_token");
  });

  for (const route of routes) {
    const target = `${baseUrl}${route.path}`;
    await page.goto(target, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      { timeout: 120000 },
      route.waitFor,
    );
    await sleep(1800);

    const filePath = path.join(setDir, `${route.name}.png`);
    await page.screenshot({ path: filePath, type: "png" });
    console.log(`captured ${path.relative(process.cwd(), filePath)}`);
  }

  await page.close();
}

await browser.close();
