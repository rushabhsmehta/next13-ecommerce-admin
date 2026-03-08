import {
  tourPackageQueryAccountingRequestSchema,
  type TourPackageQueryAccountingPayload,
} from "./tour-package-query-accounting-schema";

type ExistingTourPackageQuery = {
  id: string;
} | null;

type HandleTourPackageQueryAccountingPatchOptions = {
  userId: string | null | undefined;
  tourPackageQueryId?: string | null;
  body: unknown;
  findTourPackageQueryById: (tourPackageQueryId: string) => Promise<ExistingTourPackageQuery>;
  replaceTourPackageQueryAccounting: (
    tourPackageQueryId: string,
    payload: TourPackageQueryAccountingPayload
  ) => Promise<void>;
};

export async function handleTourPackageQueryAccountingPatch(
  options: HandleTourPackageQueryAccountingPatchOptions
): Promise<Response> {
  const {
    userId,
    tourPackageQueryId,
    body,
    findTourPackageQueryById,
    replaceTourPackageQueryAccounting,
  } = options;

  try {
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!tourPackageQueryId) {
      return new Response("Tour Package Query id is required", { status: 400 });
    }

    const existingTourPackageQuery = await findTourPackageQueryById(tourPackageQueryId);

    if (!existingTourPackageQuery) {
      return new Response("Tour Package Query not found", { status: 404 });
    }

    const parsedBody = tourPackageQueryAccountingRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          message: "Invalid accounting payload",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    await replaceTourPackageQueryAccounting(tourPackageQueryId, parsedBody.data);

    return Response.json({ message: "Accounting details updated successfully" });
  } catch (error) {
    console.error("[TOUR_PACKAGE_QUERY_ACCOUNTING_PATCH]", error);
    return new Response("Internal error", { status: 500 });
  }
}

