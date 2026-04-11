import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'mobile/marketing/generated';
const BASE = 'http://localhost:8081';

// Play Store dimensions
const SIZES = {
  phone:    { width: 1080, height: 1920, prefix: 'phone' },
  tablet7:  { width: 1200, height: 1920, prefix: 'tablet7' },
  tablet10: { width: 1600, height: 2560, prefix: 'tablet10' },
};

const PAGES = [
  { path: '/',                     name: '01-home',         scrollY: 800  },
  { path: '/(tabs)/explore',       name: '02-explore',      scrollY: 0    },
  { path: '/(tabs)/destinations',  name: '03-destinations', scrollY: 0    },
  { path: '/(tabs)/profile',       name: '04-profile',      scrollY: 0    },
];

async function waitForContent(page, ms = 10000) {
  try {
    await page.waitForFunction(
      () => !document.querySelector('[role="progressbar"]'),
      { timeout: ms }
    );
  } catch { /* timed out */ }
  await new Promise(r => setTimeout(r, 2000));
}

await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

for (const [sizeName, { width, height, prefix }] of Object.entries(SIZES)) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  for (const pg of PAGES) {
    const url = `${BASE}${pg.path}`;
    console.log(`📸 ${sizeName} → ${pg.name}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await waitForContent(page, 10000);

      // Scroll to show most interesting content
      if (pg.scrollY) {
        await page.evaluate((y) => window.scrollTo({ top: y }), pg.scrollY);
        await new Promise(r => setTimeout(r, 1000));
      }

      const file = path.join(OUT, `${prefix}-${pg.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const stat = await fs.stat(file);
      console.log(`   ✓ ${Math.round(stat.size / 1024)}KB`);
    } catch (e) {
      console.error(`   ✗ ${e.message}`);
    }
  }

  await page.close();
}

await browser.close();
console.log('\nDone! Files in', OUT);
