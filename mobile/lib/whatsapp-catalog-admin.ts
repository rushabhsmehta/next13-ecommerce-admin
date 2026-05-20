import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface CatalogProductInput {
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  heroImageUrl?: string;
  durationDays?: number;
  durationNights?: number;
  basePrice?: number;
  currency?: string;
  status?: "draft" | "active" | "archived";
}

export interface CatalogProduct {
  id: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  heroImageUrl: string | null;
  basePrice: string | null;
  currency: string;
  status: string;
  syncStatus: string;
  retailerId: string | null;
  catalogProductId: string | null;
  updatedAt: string;
}

export function createCatalogAdminClient(authRequest: AuthenticatedRequest) {
  return {
    create(input: CatalogProductInput): Promise<{ tourPackage: CatalogProduct }> {
      return authRequest("/api/mobile/whatsapp/catalog/products", {
        method: "POST",
        body: input,
      });
    },

    update(id: string, input: Partial<CatalogProductInput>) {
      return authRequest<{ tourPackage: CatalogProduct }>(
        `/api/mobile/whatsapp/catalog/products/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    delete(id: string, opts?: { removeFromMeta?: boolean }) {
      const qs = opts?.removeFromMeta ? "?removeFromMeta=true" : "";
      return authRequest<{ success: boolean }>(
        `/api/mobile/whatsapp/catalog/products/${encodeURIComponent(id)}${qs}`,
        { method: "DELETE" }
      );
    },

    sync(id: string) {
      return authRequest<{ tourPackage: CatalogProduct }>(
        `/api/mobile/whatsapp/catalog/products/${encodeURIComponent(id)}/sync`,
        { method: "POST", body: {} }
      );
    },
  };
}

export type CatalogAdminClient = ReturnType<typeof createCatalogAdminClient>;
