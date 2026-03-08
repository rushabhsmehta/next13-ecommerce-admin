import { dateToUtc } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { replaceTourPackageQueryAccountingWithDependencies } from "@/lib/tour-package-query-accounting-persistence";
import type { TourPackageQueryAccountingPayload } from "@/lib/tour-package-query-accounting-schema";

export async function replaceTourPackageQueryAccounting(
  tourPackageQueryId: string,
  payload: TourPackageQueryAccountingPayload
) {
  return replaceTourPackageQueryAccountingWithDependencies(
    {
      prismadb,
      dateToUtc,
    },
    tourPackageQueryId,
    payload
  );
}
