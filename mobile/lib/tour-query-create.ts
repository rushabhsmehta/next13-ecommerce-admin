/**
 * Typed client for creating tour-package queries from a source (inquiry /
 * package / copy). CRM-adjacent but lives in Sales & Trips; offlinePolicy is
 * draft_only so we do not flag requireOnline — the API client surfaces a
 * network error which the screen shows inline.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";
import { TOUR_QUERY_WRITE_TIMEOUT } from "@/lib/api";

export type TourQueryCreateMode = "inquiry" | "package" | "copy" | "scratch";

export interface TourQueryCreateOverrides {
  tourPackageQueryName?: string;
  /** ISO date string */
  tourStartsFrom?: string;
  /** ISO date string */
  tourEndsOn?: string;
  numAdults?: string;
  numChild5to12?: string;
  numChild0to5?: string;
  remarks?: string;
}

export interface TourQueryCreateInput {
  mode: TourQueryCreateMode;
  sourceId: string;
  overrides?: TourQueryCreateOverrides;
}

export interface TourQueryCreateResult {
  id: string;
  tourPackageQueryNumber: string;
  inquiryId?: string | null;
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createTourQueryCreateClient(authRequest: AuthenticatedRequest) {
  return {
    create(input: TourQueryCreateInput): Promise<TourQueryCreateResult> {
      return authRequest<TourQueryCreateResult>("/api/mobile/tour-queries", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("tq-create") },
        timeout: TOUR_QUERY_WRITE_TIMEOUT,
      });
    },

    fromInquiry(
      inquiryId: string,
      overrides?: TourQueryCreateOverrides
    ): Promise<TourQueryCreateResult> {
      return this.create({ mode: "inquiry", sourceId: inquiryId, overrides });
    },

    fromPackage(
      packageId: string,
      overrides?: TourQueryCreateOverrides
    ): Promise<TourQueryCreateResult> {
      return this.create({ mode: "package", sourceId: packageId, overrides });
    },

    copy(
      queryId: string,
      overrides?: TourQueryCreateOverrides
    ): Promise<TourQueryCreateResult> {
      return this.create({ mode: "copy", sourceId: queryId, overrides });
    },

    fromScratch(
      overrides?: TourQueryCreateOverrides
    ): Promise<TourQueryCreateResult> {
      return this.create({ mode: "scratch", sourceId: "scratch", overrides });
    },
  };
}

export type TourQueryCreateClient = ReturnType<
  typeof createTourQueryCreateClient
>;
