import fs from "node:fs/promises";
import path from "node:path";

const colors = {
  primary: "#e8612d",
  primaryDark: "#d4461a",
  primaryBg: "#fff7ed",
  secondary: "#9b3a8d",
  gradient1: "#f0862a",
  gradient2: "#c23a5e",
  background: "#ffffff",
  surface: "#faf9f8",
  surfaceAlt: "#f5f3f1",
  border: "#e8e5e1",
  text: "#1c1917",
  textSecondary: "#78716c",
  textTertiary: "#a8a29e",
  warning: "#f59e0b",
  chatBubbleOwn: "#e8612d",
  chatBubbleOther: "#ffffff",
};

const root = process.cwd();
const outDir = path.join(root, "mobile", "marketing", "generated");
const fullLogoPath = path.join(root, "public", "aagamholidays.png");
const emblemPath = path.join(root, "mobile", "assets", "logo-emblem-source.png");

const formats = {
  phone: { width: 1080, height: 1920 },
  tablet7: { width: 1200, height: 1920 },
  tablet10: { width: 1600, height: 2560 },
};

const fullLogoDataUri = `data:image/png;base64,${await fs.readFile(fullLogoPath, "base64")}`;
const emblemDataUri = `data:image/png;base64,${await fs.readFile(emblemPath, "base64")}`;

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const pad = (width) => Math.round(width * 0.05);
const topInset = (width) => Math.round(width * 0.11);

const svg = (width, height, body, extraDefs = "") => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.gradient1}"/>
      <stop offset="100%" stop-color="${colors.gradient2}"/>
    </linearGradient>
    <linearGradient id="warmGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD6A8"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#D95C2B" flood-opacity="0.14"/>
    </filter>
    ${extraDefs}
  </defs>
  ${body}
</svg>`;

const rect = (x, y, width, height, fill, rx = 24, extra = "") =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" ${extra}/>`;

const circle = (cx, cy, r, fill, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;

const line = (x1, y1, x2, y2, stroke, strokeWidth = 2, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;

function text(x, y, value, options = {}) {
  const { size = 36, weight = 700, fill = colors.text, anchor = "start", letterSpacing } = options;
  const spacing = letterSpacing ? ` letter-spacing="${letterSpacing}"` : "";
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${spacing}>${esc(value)}</text>`;
}

function multi(x, y, lines, options = {}) {
  const { size = 36, weight = 700, fill = colors.text, lineHeight = size * 1.2 } = options;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

function statusBar(width, dark = true) {
  const p = pad(width);
  const fill = dark ? colors.text : "#ffffff";
  return `
    ${text(p, topInset(width) * 0.54, "9:41", { size: Math.round(width * 0.034), fill, weight: 700 })}
    ${rect(width - p - width * 0.14, topInset(width) * 0.50, width * 0.045, width * 0.02, fill, 4)}
    ${rect(width - p - width * 0.086, topInset(width) * 0.50, width * 0.039, width * 0.02, fill, 4, `opacity="0.82"`)}
    ${rect(width - p - width * 0.035, topInset(width) * 0.50, width * 0.024, width * 0.02, fill, 4, `opacity="0.65"`)}
  `;
}

function bottomTabs(width, height, activeIndex) {
  const p = pad(width);
  const barH = Math.round(width * 0.19);
  const y = height - barH - Math.round(width * 0.03);
  const labels = ["Home", "Explore", "Trips", "Chat"];
  const itemW = (width - p * 2) / labels.length;
  return `
    ${rect(p, y, width - p * 2, barH, "rgba(255,255,255,0.96)", Math.round(width * 0.05), `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
    ${labels
      .map((label, index) => {
        const x = p + itemW * index;
        const cx = x + itemW / 2;
        const fill = index === activeIndex ? colors.primary : colors.textTertiary;
        return `
          ${index === activeIndex ? rect(x + itemW * 0.12, y + barH * 0.12, itemW * 0.76, barH * 0.52, colors.primaryBg, Math.round(width * 0.035)) : ""}
          ${circle(cx, y + barH * 0.34, width * 0.015, fill)}
          ${text(cx, y + barH * 0.78, label, { size: Math.round(width * 0.026), fill, weight: index === activeIndex ? 700 : 600, anchor: "middle" })}
        `;
      })
      .join("")}
  `;
}

function imageBlock(x, y, width, height, label) {
  return `
    ${rect(x, y, width, height, "url(#warmGradient)", 28)}
    <path d="M ${x + width * 0.08} ${y + height * 0.80} C ${x + width * 0.28} ${y + height * 0.48}, ${x + width * 0.40} ${y + height * 0.64}, ${x + width * 0.58} ${y + height * 0.42} S ${x + width * 0.88} ${y + height * 0.56}, ${x + width * 0.94} ${y + height * 0.30}" stroke="rgba(255,255,255,0.72)" stroke-width="${Math.max(8, width * 0.018)}" fill="none" stroke-linecap="round"/>
    ${circle(x + width * 0.78, y + height * 0.24, width * 0.08, "rgba(255,255,255,0.56)")}
    ${text(x + width * 0.08, y + height * 0.18, label, { size: Math.max(20, width * 0.07), fill: "#fff", weight: 700 })}
  `;
}

const logoImage = (x, y, width, height, href = fullLogoDataUri) =>
  `<image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;

function sectionHeader(x, y, label, title, width) {
  return `
    ${text(x, y, label, { size: Math.round(width * 0.028), fill: colors.primary, weight: 800, letterSpacing: 2 })}
    ${text(x, y + width * 0.06, title, { size: Math.round(width * 0.054), fill: colors.text, weight: 800 })}
  `;
}

function packageCard(x, y, width, title, location, price, badge, compact = false) {
  const cardH = compact ? width * 0.72 : width * 0.82;
  const imageH = compact ? width * 0.36 : width * 0.44;
  return `
    ${rect(x, y, width, cardH, colors.background, 28, `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
    ${imageBlock(x + 14, y + 14, width - 28, imageH, badge.slice(0, 3).toUpperCase())}
    ${rect(x + 30, y + 30, width * 0.24, width * 0.10, "rgba(255,255,255,0.9)", 999)}
    ${text(x + width * 0.12, y + width * 0.095, badge, { size: Math.round(width * 0.048), fill: colors.text, weight: 700, anchor: "middle" })}
    ${text(x + 28, y + imageH + 56, location, { size: Math.round(width * 0.05), fill: colors.primary, weight: 700 })}
    ${multi(x + 28, y + imageH + 110, [title], { size: Math.round(width * 0.072), fill: colors.text, lineHeight: width * 0.08 })}
    ${text(x + 28, y + cardH - 42, price, { size: Math.round(width * 0.074), fill: colors.text, weight: 800 })}
    ${circle(x + width - 54, y + cardH - 56, width * 0.08, colors.primary)}
    ${text(x + width - 54, y + cardH - 46, ">", { size: Math.round(width * 0.08), fill: "#fff", weight: 700, anchor: "middle" })}
  `;
}

function itineraryCard(x, y, width, label, title, subtitle) {
  const h = width * 0.36;
  return `
    ${rect(x, y, width, h, colors.background, 28, `stroke="${colors.border}" stroke-width="2"`)}
    ${rect(x + 20, y + 20, width * 0.16, width * 0.16, "url(#brandGradient)", 24)}
    ${text(x + width * 0.08, y + width * 0.115, label, { size: Math.round(width * 0.05), fill: "#fff", weight: 800, anchor: "middle" })}
    ${text(x + width * 0.22, y + width * 0.10, title, { size: Math.round(width * 0.065), fill: colors.text, weight: 700 })}
    ${text(x + width * 0.22, y + width * 0.18, subtitle, { size: Math.round(width * 0.043), fill: colors.textSecondary, weight: 500 })}
    ${rect(x + width * 0.22, y + width * 0.23, width * 0.60, 10, colors.surfaceAlt, 999)}
    ${rect(x + width * 0.22, y + width * 0.27, width * 0.42, 10, colors.surfaceAlt, 999)}
  `;
}

function chatRow(x, y, width, title, message, time, avatarColor = colors.primary) {
  const avatar = width * 0.11;
  return `
    ${circle(x + avatar / 2, y + avatar / 2, avatar / 2, avatarColor)}
    ${text(x + avatar / 2, y + avatar / 2 + avatar * 0.10, title[0], { size: Math.round(width * 0.06), fill: "#fff", weight: 800, anchor: "middle" })}
    ${text(x + avatar + width * 0.04, y + avatar * 0.36, title, { size: Math.round(width * 0.056), fill: colors.text, weight: 700 })}
    ${text(x + avatar + width * 0.04, y + avatar * 0.78, message, { size: Math.round(width * 0.042), fill: colors.textSecondary, weight: 500 })}
    ${text(x + width * 0.96, y + avatar * 0.36, time, { size: Math.round(width * 0.038), fill: colors.textTertiary, weight: 600, anchor: "end" })}
    ${line(x, y + avatar + width * 0.04, x + width, y + avatar + width * 0.04, colors.border, 2)}
  `;
}

function phoneHome({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const statsY = top + width * 0.67;
  const cardW = (width - p * 2 - width * 0.025) / 2;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      <rect x="0" y="0" width="${width}" height="${width * 0.64}" fill="url(#brandGradient)"/>
      ${circle(width * 0.82, width * 0.16, width * 0.24, "rgba(255,255,255,0.10)")}
      ${circle(width * 0.12, width * 0.62, width * 0.11, "rgba(255,255,255,0.08)")}
      ${statusBar(width, false)}
      ${logoImage(p, top + width * 0.005, width * 0.30, width * 0.16)}
      ${multi(p, top + width * 0.15, ["Discover", "Your Next", "Adventure"], { size: Math.round(width * 0.08), fill: "#fff", lineHeight: width * 0.09 })}
      ${text(p, top + width * 0.38, "Handcrafted tours to stunning destinations", { size: Math.round(width * 0.035), fill: "rgba(255,255,255,0.90)", weight: 500 })}
      ${rect(p, top + width * 0.46, width - p * 2, width * 0.12, "rgba(255,255,255,0.18)", width * 0.06)}
      ${text(p + width * 0.06, top + width * 0.54, "Where do you want to go?", { size: Math.round(width * 0.033), fill: "#fff", weight: 600 })}
      ${rect(p, statsY, (width - p * 2 - width * 0.024 * 2) / 3, width * 0.19, colors.background, width * 0.04, `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
      ${rect(p + (width - p * 2 - width * 0.024 * 2) / 3 + width * 0.024, statsY, (width - p * 2 - width * 0.024 * 2) / 3, width * 0.19, colors.background, width * 0.04, `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
      ${rect(p + 2 * ((width - p * 2 - width * 0.024 * 2) / 3 + width * 0.024), statsY, (width - p * 2 - width * 0.024 * 2) / 3, width * 0.19, colors.background, width * 0.04, `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
      ${text(p + width * 0.10, statsY + width * 0.12, "80+", { size: Math.round(width * 0.04), fill: colors.text, weight: 800, anchor: "middle" })}
      ${text(p + width * 0.10, statsY + width * 0.17, "Destinations", { size: Math.round(width * 0.024), fill: colors.textSecondary, weight: 600, anchor: "middle" })}
      ${text(width / 2, statsY + width * 0.12, "250+", { size: Math.round(width * 0.04), fill: colors.text, weight: 800, anchor: "middle" })}
      ${text(width / 2, statsY + width * 0.17, "Packages", { size: Math.round(width * 0.024), fill: colors.textSecondary, weight: 600, anchor: "middle" })}
      ${text(width - p - width * 0.10, statsY + width * 0.12, "10K+", { size: Math.round(width * 0.04), fill: colors.text, weight: 800, anchor: "middle" })}
      ${text(width - p - width * 0.10, statsY + width * 0.17, "Travelers", { size: Math.round(width * 0.024), fill: colors.textSecondary, weight: 600, anchor: "middle" })}
      ${sectionHeader(p, statsY + width * 0.27, "EXPLORE", "Popular Destinations", width)}
      ${imageBlock(p, statsY + width * 0.38, cardW, width * 0.56, "GOA")}
      ${imageBlock(width - p - cardW, statsY + width * 0.38, cardW, width * 0.56, "KER")}
      ${text(p + cardW * 0.10, statsY + width * 0.82, "Goa", { size: Math.round(width * 0.044), fill: "#fff", weight: 700 })}
      ${text(width - p - cardW + cardW * 0.10, statsY + width * 0.82, "Kerala", { size: Math.round(width * 0.044), fill: "#fff", weight: 700 })}
      ${sectionHeader(p, statsY + width * 1.03, "FEATURED", "Trending Packages", width)}
      ${packageCard(p, statsY + width * 1.12, width - p * 2, "Luxury Goa Escape", "North Goa", "₹24,999 /person", "Beach", true)}
      ${bottomTabs(width, height, 0)}
    `,
  );
}

function phoneExplore({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const chipY = top + width * 0.14;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      ${statusBar(width)}
      ${logoImage(p, top - width * 0.005, width * 0.22, width * 0.12)}
      ${text(width - p, top + width * 0.05, "Explore Tours", { size: Math.round(width * 0.052), fill: colors.text, weight: 800, anchor: "end" })}
      ${rect(p, top + width * 0.08, width - p * 2, width * 0.12, colors.background, width * 0.06, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.06, top + width * 0.155, "Search packages...", { size: Math.round(width * 0.034), fill: colors.textSecondary, weight: 500 })}
      ${["All", "Domestic", "Island", "Luxury"]
        .map((chip, index) => {
          const x = p + index * width * 0.225;
          return index === 0
            ? rect(x, chipY, width * 0.2, width * 0.08, "url(#brandGradient)", width * 0.04) +
                text(x + width * 0.1, chipY + width * 0.053, chip, { size: Math.round(width * 0.025), fill: "#fff", weight: 700, anchor: "middle" })
            : rect(x, chipY, width * 0.2, width * 0.08, colors.background, width * 0.04, `stroke="${colors.border}" stroke-width="2"`) +
                text(x + width * 0.1, chipY + width * 0.053, chip, { size: Math.round(width * 0.025), fill: colors.textSecondary, weight: 700, anchor: "middle" });
        })
        .join("")}
      ${packageCard(p, chipY + width * 0.13, width - p * 2, "Andaman Island Discovery", "Port Blair", "₹38,500 /person", "Island")}
      ${packageCard(p, chipY + width * 1.02, width - p * 2, "Rajasthan Heritage Trail", "Jaipur", "₹31,200 /person", "Culture")}
      ${bottomTabs(width, height, 1)}
    `,
  );
}

function phonePackage({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const heroH = width * 0.66;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      ${imageBlock(0, 0, width, heroH, "GOA")}
      ${statusBar(width, false)}
      ${rect(0, heroH - width * 0.02, width, height - heroH + width * 0.02, colors.surface, width * 0.08)}
      ${rect(p, heroH + width * 0.04, width * 0.24, width * 0.08, "url(#brandGradient)", width * 0.04)}
      ${text(p + width * 0.12, heroH + width * 0.093, "Domestic", { size: Math.round(width * 0.027), fill: "#fff", weight: 700, anchor: "middle" })}
      ${text(p, heroH + width * 0.19, "Luxury Goa Escape", { size: Math.round(width * 0.07), fill: colors.text, weight: 800 })}
      ${text(p, heroH + width * 0.27, "North Goa · 5 days · Beachside stays", { size: Math.round(width * 0.033), fill: colors.textSecondary, weight: 600 })}
      ${rect(p, heroH + width * 0.33, width * 0.25, width * 0.10, "url(#brandGradient)", width * 0.05)}
      ${text(p + width * 0.125, heroH + width * 0.395, "Itinerary", { size: Math.round(width * 0.027), fill: "#fff", weight: 700, anchor: "middle" })}
      ${rect(p + width * 0.29, heroH + width * 0.33, width * 0.25, width * 0.10, colors.background, width * 0.05, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.415, heroH + width * 0.395, "Inclusions", { size: Math.round(width * 0.027), fill: colors.textSecondary, weight: 700, anchor: "middle" })}
      ${rect(p + width * 0.58, heroH + width * 0.33, width * 0.25, width * 0.10, colors.background, width * 0.05, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.705, heroH + width * 0.395, "Policies", { size: Math.round(width * 0.027), fill: colors.textSecondary, weight: 700, anchor: "middle" })}
      ${itineraryCard(p, heroH + width * 0.48, width - p * 2, "D1", "Arrival + Sunset Cruise", "Private transfer, check-in and marina evening")}
      ${itineraryCard(p, heroH + width * 0.88, width - p * 2, "D2", "North Goa Beaches", "Fort Aguada, Candolim and curated dining")}
      ${rect(p, height - width * 0.20, width - p * 2, width * 0.12, "url(#brandGradient)", width * 0.06, `filter="url(#softShadow)"`)}
      ${text(width / 2, height - width * 0.123, "Enquire Now", { size: Math.round(width * 0.04), fill: "#fff", weight: 800, anchor: "middle" })}
    `,
  );
}

function phoneChat({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const listW = width - p * 2;
  const y = top + width * 0.22;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.background, 0)}
      ${statusBar(width)}
      ${logoImage(p, top - width * 0.005, width * 0.22, width * 0.12)}
      ${text(width - p, top + width * 0.05, "Trip Chat", { size: Math.round(width * 0.052), fill: colors.text, weight: 800, anchor: "end" })}
      ${rect(p, top + width * 0.08, listW, width * 0.14, colors.primaryBg, width * 0.05)}
      ${text(p + width * 0.04, top + width * 0.165, "Stay connected with your tour manager", { size: Math.round(width * 0.033), fill: colors.primaryDark, weight: 700 })}
      ${chatRow(p, y, listW, "Goa Escape Crew", "Aarav: Pickup confirmed for 5:30 PM", "09:42")}
      ${chatRow(p, y + width * 0.22, listW, "Kerala Family Tour", "Houseboat check-in documents shared", "08:18", colors.secondary)}
      ${chatRow(p, y + width * 0.44, listW, "Rajasthan Heritage", "See you all at Jaipur airport", "Yesterday", colors.warning)}
      ${rect(p, height - width * 0.32, listW, width * 0.18, colors.surface, width * 0.05, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.05, height - width * 0.22, "Send updates, locations and documents", { size: Math.round(width * 0.04), fill: colors.text, weight: 700 })}
      ${text(p + width * 0.05, height - width * 0.16, "Travel together without leaving the app.", { size: Math.round(width * 0.031), fill: colors.textSecondary, weight: 500 })}
      ${bottomTabs(width, height, 3)}
    `,
  );
}

function tabletHome({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const heroH = height * 0.30;
  const colGap = width * 0.025;
  const cardW = (width - p * 2 - colGap) / 2;
  const sectionY = heroH + width * 0.06;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      <rect x="0" y="0" width="${width}" height="${heroH}" fill="url(#brandGradient)"/>
      ${circle(width * 0.86, heroH * 0.24, width * 0.16, "rgba(255,255,255,0.08)")}
      ${statusBar(width, false)}
      ${logoImage(p, top, width * 0.24, width * 0.12)}
      ${multi(p, top + width * 0.08, ["Discover your", "next adventure"], { size: Math.round(width * 0.048), fill: "#fff", lineHeight: width * 0.056 })}
      ${text(p, top + width * 0.17, "Premium tours, detailed itineraries and group chat in one app.", { size: Math.round(width * 0.02), fill: "rgba(255,255,255,0.90)", weight: 500 })}
      ${rect(p, top + width * 0.205, width * 0.34, width * 0.07, "rgba(255,255,255,0.18)", width * 0.035)}
      ${text(p + width * 0.03, top + width * 0.249, "Where do you want to go?", { size: Math.round(width * 0.019), fill: "#fff", weight: 600 })}
      ${rect(width - p - width * 0.29, top + width * 0.06, width * 0.29, width * 0.16, "rgba(255,255,255,0.14)", width * 0.035)}
      ${text(width - p - width * 0.23, top + width * 0.12, "80+", { size: Math.round(width * 0.032), fill: "#fff", weight: 800, anchor: "middle" })}
      ${text(width - p - width * 0.23, top + width * 0.155, "Destinations", { size: Math.round(width * 0.014), fill: "rgba(255,255,255,0.85)", weight: 600, anchor: "middle" })}
      ${text(width - p - width * 0.145, top + width * 0.12, "250+", { size: Math.round(width * 0.032), fill: "#fff", weight: 800, anchor: "middle" })}
      ${text(width - p - width * 0.145, top + width * 0.155, "Packages", { size: Math.round(width * 0.014), fill: "rgba(255,255,255,0.85)", weight: 600, anchor: "middle" })}
      ${text(width - p - width * 0.06, top + width * 0.12, "10K+", { size: Math.round(width * 0.032), fill: "#fff", weight: 800, anchor: "middle" })}
      ${text(width - p - width * 0.06, top + width * 0.155, "Travelers", { size: Math.round(width * 0.014), fill: "rgba(255,255,255,0.85)", weight: 600, anchor: "middle" })}
      ${sectionHeader(p, sectionY, "CURATED", "Popular escapes", width)}
      ${imageBlock(p, sectionY + width * 0.09, cardW, width * 0.24, "GOA")}
      ${imageBlock(p + cardW + colGap, sectionY + width * 0.09, cardW, width * 0.24, "KER")}
      ${text(p + cardW * 0.08, sectionY + width * 0.29, "Goa", { size: Math.round(width * 0.026), fill: "#fff", weight: 700 })}
      ${text(p + cardW + colGap + cardW * 0.08, sectionY + width * 0.29, "Kerala", { size: Math.round(width * 0.026), fill: "#fff", weight: 700 })}
      ${sectionHeader(p, sectionY + width * 0.41, "FEATURED", "Trending packages", width)}
      ${packageCard(p, sectionY + width * 0.50, cardW, "Luxury Goa Escape", "North Goa", "₹24,999 /person", "Beach")}
      ${packageCard(p + cardW + colGap, sectionY + width * 0.50, cardW, "Rajasthan Heritage Trail", "Jaipur", "₹31,200 /person", "Culture")}
      ${bottomTabs(width, height, 0)}
    `,
  );
}

function tabletExplore({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const gap = width * 0.025;
  const cardW = (width - p * 2 - gap) / 2;
  const firstY = top + width * 0.19;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      ${statusBar(width)}
      ${logoImage(p, top - width * 0.004, width * 0.18, width * 0.09)}
      ${text(width - p, top + width * 0.045, "Explore Tours", { size: Math.round(width * 0.034), fill: colors.text, weight: 800, anchor: "end" })}
      ${rect(p, top + width * 0.06, width - p * 2, width * 0.07, colors.background, width * 0.035, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.04, top + width * 0.105, "Search by destination, theme or season", { size: Math.round(width * 0.02), fill: colors.textSecondary, weight: 500 })}
      ${["All Packages", "Domestic", "Island", "Luxury", "Family"]
        .map((item, index) => {
          const chipW = width * 0.16;
          const x = p + index * (chipW + width * 0.015);
          return index === 0
            ? rect(x, top + width * 0.145, chipW, width * 0.055, "url(#brandGradient)", width * 0.03) +
                text(x + chipW / 2, top + width * 0.181, item, { size: Math.round(width * 0.017), fill: "#fff", weight: 700, anchor: "middle" })
            : rect(x, top + width * 0.145, chipW, width * 0.055, colors.background, width * 0.03, `stroke="${colors.border}" stroke-width="2"`) +
                text(x + chipW / 2, top + width * 0.181, item, { size: Math.round(width * 0.017), fill: colors.textSecondary, weight: 700, anchor: "middle" });
        })
        .join("")}
      ${packageCard(p, firstY, cardW, "Andaman Island Discovery", "Port Blair", "₹38,500 /person", "Island")}
      ${packageCard(p + cardW + gap, firstY, cardW, "Luxury Goa Escape", "North Goa", "₹24,999 /person", "Beach")}
      ${packageCard(p, firstY + cardW * 0.88, cardW, "Rajasthan Heritage Trail", "Jaipur", "₹31,200 /person", "Culture")}
      ${packageCard(p + cardW + gap, firstY + cardW * 0.88, cardW, "Kerala Backwater Calm", "Alleppey", "₹29,800 /person", "Nature")}
      ${bottomTabs(width, height, 1)}
    `,
  );
}

function tabletPackage({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const heroH = height * 0.30;
  const sideW = width * 0.34;
  const mainW = width - p * 3 - sideW;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.surface, 0)}
      ${imageBlock(p, top, width - p * 2, heroH, "GOA")}
      ${statusBar(width, false)}
      ${rect(p, top + heroH - width * 0.02, width - p * 2, height - top - heroH + width * 0.02 - width * 0.23, colors.surface, width * 0.04)}
      ${rect(p + width * 0.02, top + heroH + width * 0.02, width * 0.14, width * 0.05, "url(#brandGradient)", width * 0.025)}
      ${text(p + width * 0.09, top + heroH + width * 0.055, "Domestic", { size: Math.round(width * 0.016), fill: "#fff", weight: 700, anchor: "middle" })}
      ${text(p + width * 0.02, top + heroH + width * 0.11, "Luxury Goa Escape", { size: Math.round(width * 0.04), fill: colors.text, weight: 800 })}
      ${text(p + width * 0.02, top + heroH + width * 0.16, "North Goa · 5 days · Beachside stays", { size: Math.round(width * 0.018), fill: colors.textSecondary, weight: 600 })}
      ${rect(p + width * 0.02, top + heroH + width * 0.20, width * 0.11, width * 0.05, "url(#brandGradient)", width * 0.025)}
      ${text(p + width * 0.075, top + heroH + width * 0.233, "Itinerary", { size: Math.round(width * 0.015), fill: "#fff", weight: 700, anchor: "middle" })}
      ${rect(p + width * 0.15, top + heroH + width * 0.20, width * 0.11, width * 0.05, colors.background, width * 0.025, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.205, top + heroH + width * 0.233, "Inclusions", { size: Math.round(width * 0.015), fill: colors.textSecondary, weight: 700, anchor: "middle" })}
      ${rect(p + width * 0.28, top + heroH + width * 0.20, width * 0.11, width * 0.05, colors.background, width * 0.025, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(p + width * 0.335, top + heroH + width * 0.233, "Policies", { size: Math.round(width * 0.015), fill: colors.textSecondary, weight: 700, anchor: "middle" })}
      ${itineraryCard(p + width * 0.02, top + heroH + width * 0.29, mainW, "D1", "Arrival + Sunset Cruise", "Private transfer, check-in and marina evening")}
      ${itineraryCard(p + width * 0.02, top + heroH + width * 0.55, mainW, "D2", "North Goa Beaches", "Fort Aguada, Candolim and curated dining")}
      ${rect(width - p - sideW, top + heroH + width * 0.02, sideW, width * 0.46, colors.background, width * 0.03, `stroke="${colors.border}" stroke-width="2" filter="url(#softShadow)"`)}
      ${text(width - p - sideW + width * 0.03, top + heroH + width * 0.09, "Why travelers love this trip", { size: Math.round(width * 0.02), fill: colors.text, weight: 800 })}
      ${circle(width - p - sideW + width * 0.04, top + heroH + width * 0.153, width * 0.008, colors.primary)}
      ${text(width - p - sideW + width * 0.07, top + heroH + width * 0.16, "Luxury beach stays", { size: Math.round(width * 0.017), fill: colors.textSecondary, weight: 600 })}
      ${circle(width - p - sideW + width * 0.04, top + heroH + width * 0.223, width * 0.008, colors.primary)}
      ${text(width - p - sideW + width * 0.07, top + heroH + width * 0.23, "Private airport transfers", { size: Math.round(width * 0.017), fill: colors.textSecondary, weight: 600 })}
      ${circle(width - p - sideW + width * 0.04, top + heroH + width * 0.293, width * 0.008, colors.primary)}
      ${text(width - p - sideW + width * 0.07, top + heroH + width * 0.30, "Expert local support", { size: Math.round(width * 0.017), fill: colors.textSecondary, weight: 600 })}
      ${circle(width - p - sideW + width * 0.04, top + heroH + width * 0.363, width * 0.008, colors.primary)}
      ${text(width - p - sideW + width * 0.07, top + heroH + width * 0.37, "Instant trip chat updates", { size: Math.round(width * 0.017), fill: colors.textSecondary, weight: 600 })}
      ${rect(p, height - width * 0.17, width - p * 2, width * 0.08, "url(#brandGradient)", width * 0.04)}
      ${text(width / 2, height - width * 0.118, "Enquire Now", { size: Math.round(width * 0.022), fill: "#fff", weight: 800, anchor: "middle" })}
    `,
  );
}

function tabletChat({ width, height }) {
  const p = pad(width);
  const top = topInset(width);
  const leftW = width * 0.40;
  const rightW = width - p * 3 - leftW;
  return svg(
    width,
    height,
    `
      ${rect(0, 0, width, height, colors.background, 0)}
      ${statusBar(width)}
      ${logoImage(p, top - width * 0.004, width * 0.18, width * 0.09)}
      ${text(width - p, top + width * 0.045, "Trip Chat", { size: Math.round(width * 0.034), fill: colors.text, weight: 800, anchor: "end" })}
      ${rect(p, top + width * 0.06, leftW, height - top - width * 0.25, colors.surface, width * 0.03, `stroke="${colors.border}" stroke-width="2"`)}
      ${chatRow(p + width * 0.02, top + width * 0.11, leftW - width * 0.04, "Goa Escape Crew", "Pickup confirmed for 5:30 PM", "09:42")}
      ${chatRow(p + width * 0.02, top + width * 0.28, leftW - width * 0.04, "Kerala Family Tour", "Houseboat check-in documents shared", "08:18", colors.secondary)}
      ${chatRow(p + width * 0.02, top + width * 0.45, leftW - width * 0.04, "Rajasthan Heritage", "See you all at Jaipur airport", "Yesterday", colors.warning)}
      ${rect(width - p - rightW, top + width * 0.06, rightW, height - top - width * 0.25, colors.background, width * 0.03, `stroke="${colors.border}" stroke-width="2"`)}
      ${rect(width - p - rightW + width * 0.03, top + width * 0.10, rightW - width * 0.06, width * 0.16, colors.primaryBg, width * 0.03)}
      ${text(width - p - rightW + width * 0.06, top + width * 0.16, "Tour manager updates, shared locations", { size: Math.round(width * 0.018), fill: colors.primaryDark, weight: 700 })}
      ${text(width - p - rightW + width * 0.06, top + width * 0.20, "and documents stay in one conversation.", { size: Math.round(width * 0.018), fill: colors.primaryDark, weight: 700 })}
      ${rect(width - p - rightW + width * 0.03, top + width * 0.33, rightW * 0.48, width * 0.09, colors.chatBubbleOther, width * 0.02, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(width - p - rightW + width * 0.06, top + width * 0.387, "Airport transfer starts in 20 minutes.", { size: Math.round(width * 0.015), fill: colors.textSecondary, weight: 500 })}
      ${rect(width - p - rightW + rightW * 0.36, top + width * 0.46, rightW * 0.58, width * 0.09, colors.chatBubbleOwn, width * 0.02)}
      ${text(width - p - rightW + rightW * 0.40, top + width * 0.517, "Perfect, our family is ready.", { size: Math.round(width * 0.015), fill: "#fff", weight: 600 })}
      ${rect(width - p - rightW + width * 0.03, height - width * 0.33, rightW - width * 0.06, width * 0.08, colors.surface, width * 0.02, `stroke="${colors.border}" stroke-width="2"`)}
      ${text(width - p - rightW + width * 0.06, height - width * 0.278, "Message your group", { size: Math.round(width * 0.017), fill: colors.textTertiary, weight: 500 })}
      ${bottomTabs(width, height, 3)}
    `,
  );
}

function featureGraphic() {
  return svg(
    1024,
    500,
    `
      ${rect(0, 0, 1024, 500, "#FFF7ED", 0)}
      <rect x="0" y="0" width="1024" height="500" fill="url(#featureGradient)"/>
      ${circle(860, 90, 120, "rgba(255,255,255,0.10)")}
      ${circle(90, 430, 110, "rgba(255,255,255,0.08)")}
      <path d="M 0 405 C 140 345, 290 355, 430 315 S 750 225, 1024 290 L 1024 500 L 0 500 Z" fill="rgba(255,255,255,0.10)"/>
      <path d="M 0 438 C 120 395, 270 400, 420 360 S 760 280, 1024 330 L 1024 500 L 0 500 Z" fill="rgba(255,255,255,0.16)"/>
      ${logoImage(56, 42, 250, 120)}
      ${multi(64, 172, ["Plan better trips.", "Stay connected on the go."], { size: 50, fill: "#fff", lineHeight: 58 })}
      ${text(64, 280, "Curated tours, detailed itineraries and live trip chat.", { size: 20, fill: "rgba(255,255,255,0.92)", weight: 500 })}
      ${rect(64, 322, 220, 56, "rgba(255,255,255,0.18)", 28)}
      ${text(174, 358, "Curated tours", { size: 20, fill: "#fff", weight: 700, anchor: "middle" })}
      ${rect(298, 322, 220, 56, "rgba(255,255,255,0.18)", 28)}
      ${text(408, 358, "Trip chat", { size: 20, fill: "#fff", weight: 700, anchor: "middle" })}
      ${rect(532, 322, 220, 56, "rgba(255,255,255,0.18)", 28)}
      ${text(642, 358, "Instant itineraries", { size: 20, fill: "#fff", weight: 700, anchor: "middle" })}
      <g transform="translate(746 72)" filter="url(#softShadow)">
        ${rect(0, 0, 238, 356, "rgba(255,255,255,0.94)", 34)}
        ${rect(18, 18, 202, 132, "url(#warmGradient)", 24)}
        ${logoImage(48, 26, 142, 104, emblemDataUri)}
        ${text(36, 188, "Goa Escape", { size: 24, fill: colors.text, weight: 800 })}
        ${text(36, 222, "5 days · Beach stays · Chat enabled", { size: 14, fill: colors.textSecondary, weight: 600 })}
        ${rect(36, 248, 166, 18, colors.surfaceAlt, 9)}
        ${rect(36, 278, 134, 18, colors.surfaceAlt, 9)}
        ${rect(36, 308, 116, 18, colors.surfaceAlt, 9)}
      </g>
    `,
    `<linearGradient id="featureGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EA622D"/><stop offset="100%" stop-color="#B73B67"/></linearGradient>`,
  );
}

const assets = [
  ["feature-graphic.svg", featureGraphic()],
  ["phone-01-home.svg", phoneHome(formats.phone)],
  ["phone-02-explore.svg", phoneExplore(formats.phone)],
  ["phone-03-package.svg", phonePackage(formats.phone)],
  ["phone-04-chat.svg", phoneChat(formats.phone)],
  ["tablet7-01-home.svg", tabletHome(formats.tablet7)],
  ["tablet7-02-explore.svg", tabletExplore(formats.tablet7)],
  ["tablet7-03-package.svg", tabletPackage(formats.tablet7)],
  ["tablet7-04-chat.svg", tabletChat(formats.tablet7)],
  ["tablet10-01-home.svg", tabletHome(formats.tablet10)],
  ["tablet10-02-explore.svg", tabletExplore(formats.tablet10)],
  ["tablet10-03-package.svg", tabletPackage(formats.tablet10)],
  ["tablet10-04-chat.svg", tabletChat(formats.tablet10)],
];

await fs.mkdir(outDir, { recursive: true });

for (const [fileName, content] of assets) {
  await fs.writeFile(path.join(outDir, fileName), content, "utf8");
}

console.log(`Generated ${assets.length} SVG store assets in ${outDir}`);
