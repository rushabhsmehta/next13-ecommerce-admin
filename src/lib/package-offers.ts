import type { Prisma } from "@prisma/client";

type OfferWindowRow = {
  isOffer?: boolean | null;
  isFeatured?: boolean | null;
  isArchived?: boolean | null;
  offerTitle?: string | null;
  offerSubtitle?: string | null;
  offerBadge?: string | null;
  offerPrice?: string | null;
  offerOriginalPrice?: string | null;
  offerStartsAt?: Date | string | null;
  offerEndsAt?: Date | string | null;
  offerSortOrder?: number | null;
  offerTerms?: unknown;
};

export const PACKAGE_OFFER_FIELDS = {
  isOffer: true,
  offerTitle: true,
  offerSubtitle: true,
  offerBadge: true,
  offerPrice: true,
  offerOriginalPrice: true,
  offerStartsAt: true,
  offerEndsAt: true,
  offerSortOrder: true,
  offerTerms: true,
} as const;

export function activeOfferWhere(now = new Date()): Prisma.TourPackageWhereInput {
  return {
    isFeatured: true,
    isArchived: false,
    isOffer: true,
    AND: [
      { OR: [{ offerStartsAt: null }, { offerStartsAt: { lte: now } }] },
      { OR: [{ offerEndsAt: null }, { offerEndsAt: { gte: now } }] },
    ],
  };
}

export const activeOfferOrderBy = [
  { offerSortOrder: "asc" as const },
  { websiteSortOrder: "asc" as const },
  { createdAt: "desc" as const },
];

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function isActivePackageOffer(row: OfferWindowRow, now = new Date()): boolean {
  if (!row.isOffer || !row.isFeatured || row.isArchived) return false;
  const startsAt = asDate(row.offerStartsAt);
  const endsAt = asDate(row.offerEndsAt);
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

export type PackageOfferStatus =
  | "none"
  | "draft"
  | "scheduled"
  | "live"
  | "expired"
  | "archived";

export function getPackageOfferStatus(row: OfferWindowRow, now = new Date()): PackageOfferStatus {
  if (row.isArchived) return "archived";
  if (!row.isOffer) return "none";
  if (!row.isFeatured) return "draft";
  const startsAt = asDate(row.offerStartsAt);
  const endsAt = asDate(row.offerEndsAt);
  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt < now) return "expired";
  return "live";
}

export function parseOfferTerms(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return parseOfferTerms(JSON.parse(value));
    } catch {
      return value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function buildPublicOfferPayload(row: OfferWindowRow, now = new Date()) {
  const active = isActivePackageOffer(row, now);
  return {
    isOffer: Boolean(row.isOffer),
    isOfferActive: active,
    offerTitle: active ? row.offerTitle ?? null : null,
    offerSubtitle: active ? row.offerSubtitle ?? null : null,
    offerBadge: active ? row.offerBadge || "Limited Offer" : null,
    offerPrice: active ? row.offerPrice ?? null : null,
    offerOriginalPrice: active ? row.offerOriginalPrice ?? null : null,
    offerStartsAt: active ? row.offerStartsAt ?? null : null,
    offerEndsAt: active ? row.offerEndsAt ?? null : null,
    offerSortOrder: row.offerSortOrder ?? 0,
    offerTerms: active ? parseOfferTerms(row.offerTerms) : [],
  };
}

export function formatOfferValidity(row: OfferWindowRow): string | null {
  const startsAt = asDate(row.offerStartsAt);
  const endsAt = asDate(row.offerEndsAt);
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (startsAt && endsAt) return `Valid ${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
  if (endsAt) return `Valid till ${formatter.format(endsAt)}`;
  if (startsAt) return `Starts ${formatter.format(startsAt)}`;
  return null;
}
