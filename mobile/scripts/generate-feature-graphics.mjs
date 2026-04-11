import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const outDir = path.resolve("mobile", "marketing", "feature-graphics");
const logo = await fs.readFile(path.resolve("public", "aagamholidays.png"), "base64");
const homeShot = await fs.readFile(path.resolve("mobile", "marketing", "live", "android-phone", "01-home.png"), "base64");
const exploreShot = await fs.readFile(path.resolve("mobile", "marketing", "live", "android-phone", "02-explore.png"), "base64");
const goaShot = await fs.readFile(path.resolve("mobile", "marketing", "live", "android-phone", "03-goa-destination.png"), "base64");

const logoUri = `data:image/png;base64,${logo}`;
const homeUri = `data:image/png;base64,${homeShot}`;
const exploreUri = `data:image/png;base64,${exploreShot}`;
const goaUri = `data:image/png;base64,${goaShot}`;

const variants = [
  {
    name: "feature-graphic-premium",
    title: ["Premium journeys,", "beautifully organized."],
    subtitle: "Plan with confidence across curated tours, destination discovery and polished trip details.",
    gradientStart: "#EA622D",
    gradientEnd: "#B73B67",
    chip: "Premium planning",
    shot: exploreUri,
    shotFrame: { x: 720, y: 58, w: 238, h: 384 },
  },
  {
    name: "feature-graphic-luxury",
    title: ["Luxury escapes,", "crafted end to end."],
    subtitle: "From standout stays to seamless coordination, the Aagam Holidays app keeps every detail in view.",
    gradientStart: "#B45309",
    gradientEnd: "#7C2D12",
    chip: "Luxury travel",
    shot: goaUri,
    shotFrame: { x: 700, y: 54, w: 258, h: 392 },
  },
  {
    name: "feature-graphic-family",
    title: ["Family trips,", "made reassuringly simple."],
    subtitle: "Browse destinations, compare plans and keep everyone aligned with clear, mobile-first travel tools.",
    gradientStart: "#F97316",
    gradientEnd: "#9333EA",
    chip: "Family-friendly",
    shot: homeUri,
    shotFrame: { x: 720, y: 56, w: 238, h: 386 },
  },
];

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const textBlock = (lines, x, y, size, lineHeight, fill = "#fff") =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="800">${
    lines
      .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
      .join("")
  }</text>`;

const svgFor = (variant) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${variant.gradientStart}"/>
      <stop offset="100%" stop-color="${variant.gradientEnd}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#140B12" flood-opacity="0.18"/>
    </filter>
    <clipPath id="screenClip">
      <rect x="${variant.shotFrame.x}" y="${variant.shotFrame.y}" width="${variant.shotFrame.w}" height="${variant.shotFrame.h}" rx="34"/>
    </clipPath>
  </defs>

  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="878" cy="78" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="106" cy="430" r="96" fill="rgba(255,255,255,0.08)"/>
  <path d="M 0 402 C 180 322, 356 350, 520 296 S 808 226, 1024 288 L 1024 500 L 0 500 Z" fill="rgba(255,255,255,0.10)"/>
  <path d="M 0 438 C 154 388, 334 390, 506 348 S 818 278, 1024 328 L 1024 500 L 0 500 Z" fill="rgba(255,255,255,0.14)"/>

  <image href="${logoUri}" x="52" y="34" width="180" height="112" preserveAspectRatio="xMidYMid meet"/>
  ${textBlock(variant.title, 64, 172, 52, 60)}
  <text x="64" y="290" fill="rgba(255,255,255,0.92)" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500">${esc(variant.subtitle)}</text>

  <rect x="64" y="326" width="190" height="54" rx="27" fill="rgba(255,255,255,0.18)"/>
  <text x="159" y="360" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" text-anchor="middle">${esc(variant.chip)}</text>
  <rect x="272" y="326" width="214" height="54" rx="27" fill="rgba(255,255,255,0.18)"/>
  <text x="379" y="360" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" text-anchor="middle">Real in-app experience</text>

  <g filter="url(#shadow)">
    <rect x="${variant.shotFrame.x - 12}" y="${variant.shotFrame.y - 12}" width="${variant.shotFrame.w + 24}" height="${variant.shotFrame.h + 24}" rx="40" fill="rgba(255,255,255,0.18)"/>
    <rect x="${variant.shotFrame.x}" y="${variant.shotFrame.y}" width="${variant.shotFrame.w}" height="${variant.shotFrame.h}" rx="34" fill="rgba(255,255,255,0.96)"/>
    <image href="${variant.shot}" x="${variant.shotFrame.x}" y="${variant.shotFrame.y}" width="${variant.shotFrame.w}" height="${variant.shotFrame.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#screenClip)"/>
  </g>
</svg>`;

await fs.mkdir(outDir, { recursive: true });

for (const variant of variants) {
  const svgPath = path.join(outDir, `${variant.name}.svg`);
  await fs.writeFile(svgPath, svgFor(variant), "utf8");
}

const browser = await puppeteer.launch({
  headless: true,
  args: [`--user-data-dir=C:/temp/codex-feature-${Date.now()}`],
});
const page = await browser.newPage();

for (const variant of variants) {
  const svgPath = path.resolve(outDir, `${variant.name}.svg`);
  const pngPath = path.resolve(outDir, `${variant.name}.png`);
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await page.goto(`file:///${svgPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, type: "png" });
  console.log(`generated ${path.relative(process.cwd(), pngPath)}`);
}

await browser.close();
