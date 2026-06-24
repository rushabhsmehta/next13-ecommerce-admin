import { ApiError } from "@/lib/api";
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface CrmInquiryTourPackageQuerySummary {
  id: string;
  inquiryId: string | null;
  tourPackageQueryName: string | null;
  tourPackageQueryNumber: string | null;
  tourPackageQueryType: string | null;
  isFeatured: boolean;
  updatedAt: string;
}

export interface CrmInquiryListRow {
  id: string;
  status: string;
  customerName: string;
  customerMobileNumber: string;
  numAdults: number;
  numChildren5to11: number;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
  location?: { id: string; label: string } | null;
  associatePartner?: { id: string; name: string } | null;
  tourPackageQueries?: CrmInquiryTourPackageQuerySummary[] | null;
}

export interface CrmInquiryListResult {
  items: CrmInquiryListRow[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
}

type PaginatedInquiryListResponse = {
  items?: CrmInquiryListRow[];
  inquiries?: CrmInquiryListRow[];
  total?: number;
  nextOffset?: number;
  hasMore?: boolean;
};

/**
 * Staff CRM inquiry list. Prefer `/api/mobile/crm/inquiries` (bearer-safe, paginated).
 * Fall back to `GET /api/inquiries` when the mobile route is not deployed yet (404).
 */
export async function fetchCrmInquiriesList(
  authRequest: AuthenticatedRequest,
  queryString: string,
  options?: {
    retries?: number;
    cacheTtlSeconds?: number;
    dedupe?: boolean;
    staleOnError?: boolean;
  }
): Promise<CrmInquiryListResult> {
  const qs = queryString ? (queryString.startsWith("?") ? queryString : `?${queryString}`) : "";
  const mobilePath = `/api/mobile/crm/inquiries${qs}`;
  const legacyPath = `/api/inquiries${qs}`;

  const requestOpts = {
    retries: options?.retries ?? 1,
    cacheTtlSeconds: options?.cacheTtlSeconds ?? 20,
    dedupe: options?.dedupe ?? true,
    staleOnError: options?.staleOnError ?? true,
  };

  try {
    const response = await authRequest<
      PaginatedInquiryListResponse | CrmInquiryListRow[]
    >(mobilePath, requestOpts);
    return normalizeInquiryListResponse(response, 0);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      const legacy = await authRequest<CrmInquiryListRow[]>(legacyPath, {
        ...requestOpts,
        cacheKey: `legacy-inquiries:${qs}`,
      });
      return normalizeInquiryListResponse(legacy, 0);
    }
    throw err;
  }
}

function normalizeInquiryListResponse(
  response: PaginatedInquiryListResponse | CrmInquiryListRow[],
  offset: number
): CrmInquiryListResult {
  const list = Array.isArray(response)
    ? response
    : response.items ?? response.inquiries ?? [];
  const total = Array.isArray(response) ? list.length : response.total ?? list.length;
  const nextOffset = Array.isArray(response)
    ? offset + list.length
    : response.nextOffset ?? offset + list.length;
  const hasMore = Array.isArray(response)
    ? false
    : response.hasMore ?? nextOffset < total;

  return { items: list, total, nextOffset, hasMore };
}
