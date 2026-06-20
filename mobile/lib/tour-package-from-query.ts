import type { AuthenticatedRequest } from "@/lib/associate-inquiries";
import type { TourPackageFormInitial } from "@/components/tour-packages/TourPackageForm";

export type TourPackageFromQueryPrefill = TourPackageFormInitial & {
  sourceQueryId: string;
  sourceQueryName: string | null;
  sourceQueryNumber: string | null;
};

export function createTourPackageFromQueryClient(authRequest: AuthenticatedRequest) {
  return {
    loadPrefill(queryId: string): Promise<TourPackageFromQueryPrefill> {
      return authRequest<TourPackageFromQueryPrefill>(
        `/api/mobile/tour-packages/from-query/${encodeURIComponent(queryId)}`,
        { retries: 1 }
      );
    },
  };
}

export type TourPackageFromQueryClient = ReturnType<
  typeof createTourPackageFromQueryClient
>;
