// Plain-text helpers for rendering Jodit/ProseMirror content inside React Native <Text>.
// React Native's <Text> doesn't parse markup, so DB strings like
// "<p data-start=\"206\">...</p>" render literally on screen. These helpers
// strip tags, decode entities, and split package-name pipe strings.

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
};

const decodeEntities = (input: string): string => {
  let out = input;
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.split(entity).join(char);
  }
  out = out.replace(/&#(\d+);/g, (_, code) => {
    const num = Number(code);
    return Number.isFinite(num) ? String.fromCodePoint(num) : "";
  });
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const num = parseInt(hex, 16);
    return Number.isFinite(num) ? String.fromCodePoint(num) : "";
  });
  return out;
};

export const stripHtml = (input: unknown): string => {
  if (input == null) return "";
  if (typeof input !== "string") return String(input);
  let out = input;
  // Block-level tags become paragraph breaks
  out = out.replace(/<\s*\/?\s*(p|div|br|li|h[1-6])[^>]*>/gi, "\n");
  // Drop everything else
  out = out.replace(/<[^>]+>/g, "");
  out = decodeEntities(out);
  // Collapse whitespace, preserve paragraph breaks
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
};

const walkProseMirrorNode = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(walkProseMirrorNode).join("");
  if (typeof node !== "object") return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    const inner = node.content.map(walkProseMirrorNode).join("");
    if (node.type === "paragraph" || node.type === "heading" || node.type === "list_item") {
      return inner + "\n\n";
    }
    if (node.type === "hard_break" || node.type === "br") {
      return "\n";
    }
    return inner;
  }
  return "";
};

export const extractPlainText = (input: unknown): string => {
  if (input == null) return "";
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractPlainText(JSON.parse(trimmed));
      } catch {
        // not JSON, fall through to HTML strip
      }
    }
    return stripHtml(input);
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => extractPlainText(item))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }
  if (typeof input === "object") {
    const obj = input as any;
    if (obj.type === "doc" || Array.isArray(obj.content)) {
      return walkProseMirrorNode(obj).replace(/\n{3,}/g, "\n\n").trim();
    }
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return stripHtml(obj.content);
  }
  return "";
};

// Splits content into a list of plain-text paragraphs (drops empties).
export const extractPlainTextLines = (input: unknown): string[] => {
  const text = extractPlainText(input);
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
};

const ALL_CAPS_RE = /^[\sA-Z0-9–—\-|()\/&,.':!?]+$/;

export const toTitleCase = (input: string): string => {
  if (!input) return "";
  // Only force title-case if the input is screaming all-caps; preserve mixed case otherwise.
  if (!ALL_CAPS_RE.test(input)) return input;
  return input
    .toLowerCase()
    .replace(/(^|[\s\-–—()\/])(\p{L})/gu, (_, prefix, char) => prefix + char.toUpperCase());
};

export interface PackageNameParts {
  title: string;
  subtitle?: string;
  duration?: string;
  route?: string;
  raw: string;
}

const DURATION_RE = /^\s*\d+\s*[Nn]\s*[\-/]\s*\d+\s*[Dd]\s*$|^\s*\d+\s*[Nn]\s*\d+\s*[Dd]\s*$|^\s*\d+\s*(nights?|days?)\b/i;
const SUBTITLE_HINT_RE = /(odyssey|journey|escape|experience|retreat|getaway|adventure|expedition|tale|saga|sojourn|paradise|trail|circuit|holiday)/i;
const ROUTE_RE = /[–—\-→>]/;

export const splitPackageName = (raw: unknown): PackageNameParts => {
  const cleaned = extractPlainText(raw).replace(/\s+/g, " ").trim();
  if (!cleaned) return { title: "", raw: "" };

  const segments = cleaned
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    return { title: toTitleCase(cleaned), raw: cleaned };
  }

  let title: string | undefined;
  let subtitle: string | undefined;
  let duration: string | undefined;
  let route: string | undefined;

  for (const seg of segments) {
    if (!duration && DURATION_RE.test(seg)) {
      duration = seg.replace(/\s+/g, "");
      continue;
    }
    if (!route && ROUTE_RE.test(seg) && seg.split(ROUTE_RE).length >= 3) {
      route = seg;
      continue;
    }
    if (!subtitle && SUBTITLE_HINT_RE.test(seg)) {
      subtitle = toTitleCase(seg);
      continue;
    }
    if (!title) {
      title = toTitleCase(seg);
      continue;
    }
    // Anything left that has separators but wasn't claimed is likely the route
    if (!route && ROUTE_RE.test(seg)) {
      route = seg;
      continue;
    }
    // Otherwise append to subtitle as a fallback
    subtitle = subtitle ? `${subtitle} · ${toTitleCase(seg)}` : toTitleCase(seg);
  }

  return {
    title: title || toTitleCase(segments[0]),
    subtitle,
    duration,
    route,
    raw: cleaned,
  };
};

export interface DistanceDuration {
  distance?: string;
  duration?: string;
  cleanedTitle: string;
}

const DISTANCE_RE = /(\d+(?:[.,]\d+)?\s*(?:km|kms|kilometres?|kilometers?))/i;
const TIME_RE = /(\d+(?:\s*[\-–]\s*\d+)?\s*(?:hrs?|hours?|mins?|minutes?))/i;

// Strips trailing parenthetical "(130 Km / 5-6 Hrs)" from a day title and
// returns the parts separately so they can be rendered as chips.
export const extractDistanceDuration = (rawTitle: unknown): DistanceDuration => {
  const text = extractPlainText(rawTitle).replace(/\s+/g, " ").trim();
  if (!text) return { cleanedTitle: "" };

  const parenMatch = text.match(/\(([^()]+)\)\s*$/);
  if (!parenMatch) {
    return { cleanedTitle: text };
  }

  const inner = parenMatch[1];
  const distance = inner.match(DISTANCE_RE)?.[1]?.trim();
  const duration = inner.match(TIME_RE)?.[1]?.trim();

  if (!distance && !duration) return { cleanedTitle: text };

  const cleaned = text.slice(0, parenMatch.index).trim().replace(/[\-–—:]\s*$/, "").trim();
  return {
    cleanedTitle: cleaned || text,
    distance,
    duration,
  };
};
