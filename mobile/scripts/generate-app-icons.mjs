/**
 * Generates per-variant app icons: same Aagam Holidays emblem + optional corner badge.
 * Run from repo root: node mobile/scripts/generate-app-icons.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(scriptDir, "..", "assets");
const EMBLEM_FILE = "logo-emblem-source.png";
const SIZE = 1024;

/** Fraction of canvas used by the emblem (breathing room on home screen). */
const ICON_MARK_SCALE = 0.54;
/** Slightly smaller for Android adaptive foreground (safe zone ~66%). */
const ADAPTIVE_MARK_SCALE = 0.5;
const BADGE_SIZE = 200;
const BADGE_INSET = 72;

const CREAM_BG = { r: 255, g: 248, b: 240, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const variants = [
  {
    id: "public",
    iconFile: "icon.png",
    adaptiveFile: "adaptive-icon.png",
    badge: null,
  },
  {
    id: "staff",
    iconFile: "icon-staff.png",
    adaptiveFile: "adaptive-icon-staff.png",
    badge: "badge-staff.svg",
  },
  {
    id: "finance",
    iconFile: "icon-finance.png",
    adaptiveFile: "adaptive-icon-finance.png",
    badge: "badge-finance.svg",
  },
];

async function loadEmblem(renderSize, background = TRANSPARENT) {
  const emblemPath = path.join(assetsDir, EMBLEM_FILE);
  return sharp(emblemPath)
    .trim()
    .resize(renderSize, renderSize, { fit: "contain", background })
    .png()
    .toBuffer();
}

async function loadBadge(badgeFile) {
  const badgePath = path.join(assetsDir, badgeFile);
  return sharp(badgePath).resize(BADGE_SIZE, BADGE_SIZE).png().toBuffer();
}

async function buildLayers({ markScale, badgeFile }) {
  const markSize = Math.round(SIZE * markScale);
  const offset = Math.round((SIZE - markSize) / 2);
  const emblem = await loadEmblem(markSize, CREAM_BG);

  const layers = [{ input: emblem, left: offset, top: offset }];

  if (badgeFile) {
    const badge = await loadBadge(badgeFile);
    layers.push({
      input: badge,
      left: SIZE - BADGE_SIZE - BADGE_INSET,
      top: SIZE - BADGE_SIZE - BADGE_INSET,
    });
  }

  return layers;
}

async function writeIcon({ layers, outPath }) {
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: CREAM_BG },
  })
    .composite(layers)
    .png()
    .toFile(outPath);
}

async function writeAdaptiveForeground({ markScale, badgeFile, outPath }) {
  const markSize = Math.round(SIZE * markScale);
  const offset = Math.round((SIZE - markSize) / 2);
  const emblem = await loadEmblem(markSize, TRANSPARENT);

  const layers = [{ input: emblem, left: offset, top: offset }];

  if (badgeFile) {
    const badge = await loadBadge(badgeFile);
    layers.push({
      input: badge,
      left: SIZE - BADGE_SIZE - BADGE_INSET,
      top: SIZE - BADGE_SIZE - BADGE_INSET,
    });
  }

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: TRANSPARENT },
  })
    .composite(layers)
    .png()
    .toFile(outPath);
}

for (const variant of variants) {
  const iconPath = path.join(assetsDir, variant.iconFile);
  const adaptivePath = path.join(assetsDir, variant.adaptiveFile);

  const iconLayers = await buildLayers({
    markScale: ICON_MARK_SCALE,
    badgeFile: variant.badge,
  });
  await writeIcon({ layers: iconLayers, outPath: iconPath });

  await writeAdaptiveForeground({
    markScale: ADAPTIVE_MARK_SCALE,
    badgeFile: variant.badge,
    outPath: adaptivePath,
  });

  console.log(`✓ ${variant.id}: ${variant.iconFile}, ${variant.adaptiveFile}`);
}

const publicIcon = path.join(assetsDir, "icon.png");
await sharp(publicIcon).resize(48, 48).png().toFile(path.join(assetsDir, "favicon.png"));

const notificationMark = Math.round(96 * 0.72);
const notificationOffset = Math.round((96 - notificationMark) / 2);
const notificationEmblem = await loadEmblem(notificationMark, TRANSPARENT);
await sharp({
  create: { width: 96, height: 96, channels: 4, background: TRANSPARENT },
})
  .composite([{ input: notificationEmblem, left: notificationOffset, top: notificationOffset }])
  .png()
  .toFile(path.join(assetsDir, "notification-icon.png"));

await sharp(publicIcon).resize(512, 512).png().toFile(path.join(assetsDir, "play-store-icon-512.png"));

console.log("✓ favicon.png, notification-icon.png, play-store-icon-512.png");
