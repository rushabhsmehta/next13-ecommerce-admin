import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface WebsiteLocationOption {
  id: string;
  label: string;
  slug?: string | null;
}

export interface WebsiteRelatedPackage {
  id: string;
  name: string;
  locationId: string;
  isArchived: boolean;
  websiteSortOrder: number;
  sortOrder: number;
}

export interface WebsitePackage {
  id: string;
  name: string;
  slug?: string | null;
  locationId: string;
  locationLabel: string;
  locationSlug?: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  websiteSortOrder: number;
  tourPackageType?: string | null;
  tourCategory?: string | null;
  numDaysNight?: string | null;
  price?: string | null;
  heroImageUrl?: string | null;
  updatedAt?: string | null;
  relatedPackages: WebsiteRelatedPackage[];
}

export interface WebsitePackageListResponse {
  items: WebsitePackage[];
  locations: WebsiteLocationOption[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface WebsitePackageUpdateInput {
  isFeatured?: boolean;
  isArchived?: boolean;
  websiteSortOrder?: number;
  tourPackageType?: string | null;
  tourCategory?: string | null;
  numDaysNight?: string | null;
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function qsFrom(filters: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && String(value).trim() !== "") qs.set(key, String(value));
  }
  const raw = qs.toString();
  return raw ? `?${raw}` : "";
}

export function createWebsiteManagementClient(authRequest: AuthenticatedRequest) {
  return {
    listPackages(
      filters: {
        search?: string;
        locationId?: string;
        status?: "all" | "published" | "draft" | "archived" | "featured";
        limit?: number;
        offset?: number;
      } = {}
    ): Promise<WebsitePackageListResponse> {
      return authRequest<WebsitePackageListResponse>(
        `/api/mobile/website/packages${qsFrom(filters)}`,
        { retries: 1 }
      );
    },

    updatePackage(id: string, input: WebsitePackageUpdateInput): Promise<WebsitePackage> {
      return authRequest<WebsitePackage>(
        `/api/mobile/website/packages/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          headers: { "Idempotency-Key": makeIdempotencyKey("website-package-update") },
        }
      );
    },

    reorderPackages(locationId: string, orderedIds: string[]): Promise<{ success: boolean }> {
      return authRequest<{ success: boolean }>("/api/mobile/website/reorder", {
        method: "PATCH",
        body: { locationId, orderedIds },
        headers: { "Idempotency-Key": makeIdempotencyKey("website-package-reorder") },
      });
    },

    updateRelated(id: string, relatedIds: string[]): Promise<{ success: boolean; relatedIds: string[] }> {
      return authRequest(`/api/mobile/website/packages/${encodeURIComponent(id)}/related`, {
        method: "PUT",
        body: { relatedIds },
        headers: { "Idempotency-Key": makeIdempotencyKey("website-related-update") },
      });
    },
  };
}

export type WebsiteManagementClient = ReturnType<typeof createWebsiteManagementClient>;

