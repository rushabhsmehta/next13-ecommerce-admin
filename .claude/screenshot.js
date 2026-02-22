const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: 'D:/GitHub/next13-ecommerce-admin/.claude/preview.png', fullPage: false });
  await browser.close();
  console.log('Screenshot saved.');
})().catch(e => { console.error(e.message); process.exit(1); });
