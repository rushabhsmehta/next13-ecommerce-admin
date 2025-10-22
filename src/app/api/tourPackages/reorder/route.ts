import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { isCurrentUserAssociate } from "@/lib/associate-utils";

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (await isCurrentUserAssociate()) {
      return new NextResponse("Associates cannot modify website ordering", { status: 403 });
    }

    const body = await req.json();
    const { orderedIds, locationId } = body as { orderedIds?: string[]; locationId?: string };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return new NextResponse("orderedIds array is required", { status: 400 });
    }

    const uniqueIds = Array.from(new Set(orderedIds));
    if (uniqueIds.length !== orderedIds.length) {
      return new NextResponse("orderedIds must not contain duplicates", { status: 400 });
    }

    const packages = await prismadb.tourPackage.findMany({
      where: {
        id: {
          in: orderedIds,
        },
      },
      select: {
        id: true,
        locationId: true,
        isArchived: true,
      },
    });

    if (packages.length !== orderedIds.length) {
      return new NextResponse("One or more tour packages not found", { status: 404 });
    }

    if (locationId) {
      const mismatched = packages.find((pkg) => pkg.locationId !== locationId);
      if (mismatched) {
        return new NextResponse("All tour packages must belong to the specified location", { status: 400 });
      }
    }

    const archivedPackage = packages.find((pkg) => pkg.isArchived);
    if (archivedPackage) {
      return new NextResponse("Archived tour packages cannot be reordered", { status: 400 });
    }

    const transaction = orderedIds.map((id, index) =>
      prismadb.tourPackage.update({
        where: { id },
        data: { websiteSortOrder: index },
      })
    );

    await prismadb.$transaction(transaction);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[TOUR_PACKAGES_REORDER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
