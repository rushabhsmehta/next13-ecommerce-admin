import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type TourQueryLifecycleAction =
  | "confirm"
  | "unconfirm"
  | "archive"
  | "unarchive";

export interface TourQueryLifecycleResult {
  id: string;
  isFeatured: boolean;
  isArchived: boolean;
}

export interface TourQueryDeleteResult {
  deleted: boolean;
  id: string;
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createTourQueryLifecycleClient(authRequest: AuthenticatedRequest) {
  return {
    run(
      tourPackageQueryId: string,
      action: TourQueryLifecycleAction
    ): Promise<TourQueryLifecycleResult> {
      return authRequest<TourQueryLifecycleResult>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourPackageQueryId)}/lifecycle`,
        {
          method: "POST",
          body: { action },
          headers: {
            "Idempotency-Key": makeIdempotencyKey(`tpq-${action}`),
          },
        }
      );
    },

    delete(tourPackageQueryId: string): Promise<TourQueryDeleteResult> {
      return authRequest<TourQueryDeleteResult>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourPackageQueryId)}`,
        {
          method: "DELETE",
          headers: {
            "Idempotency-Key": makeIdempotencyKey("tpq-delete"),
          },
        }
      );
    },
  };
}

export type TourQueryLifecycleClient = ReturnType<
  typeof createTourQueryLifecycleClient
>;
