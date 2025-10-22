import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { isCurrentUserAssociate } from "@/lib/associate-utils";

const DEFAULT_RELATION_TYPE = "related";

export async function GET(
  _req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { tourPackageId } = params;

    if (!tourPackageId) {
      return new NextResponse("Tour package id is required", { status: 400 });
    }

    const relations = await prismadb.tourPackageRelation.findMany({
      where: {
        tourPackageId,
        relationType: DEFAULT_RELATION_TYPE,
      },
      include: {
        relatedTourPackage: {
          select: {
            id: true,
            tourPackageName: true,
            locationId: true,
            websiteSortOrder: true,
            isArchived: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(relations);
  } catch (error) {
    console.log("[TOUR_PACKAGE_RELATED_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (await isCurrentUserAssociate()) {
      return new NextResponse("Associates cannot modify related tour packages", { status: 403 });
    }

    const { tourPackageId } = params;

    if (!tourPackageId) {
      return new NextResponse("Tour package id is required", { status: 400 });
    }

    const body = await req.json();
    const { relatedIds, relationType } = body as { relatedIds?: string[]; relationType?: string };

    if (!Array.isArray(relatedIds)) {
      return new NextResponse("relatedIds array is required", { status: 400 });
    }

    const sanitizedIds = Array.from(
      new Set(
        relatedIds.filter((id) => typeof id === "string" && id.trim().length > 0 && id !== tourPackageId)
      )
    );

    if (sanitizedIds.length !== relatedIds.length) {
      console.warn("[TOUR_PACKAGE_RELATED_PUT] Duplicate or invalid ids were filtered out");
    }

    const targetPackages = sanitizedIds.length
      ? await prismadb.tourPackage.findMany({
          where: {
            id: {
              in: sanitizedIds,
            },
          },
          select: {
            id: true,
            isArchived: true,
          },
        })
      : [];

    if (targetPackages.length !== sanitizedIds.length) {
      return new NextResponse("One or more related tour packages were not found", { status: 404 });
    }

    const archivedTarget = targetPackages.find((pkg) => pkg.isArchived);
    if (archivedTarget) {
      return new NextResponse("Archived tour packages cannot be added as related", { status: 400 });
    }

    const finalRelationType = relationType && relationType.trim().length > 0 ? relationType : DEFAULT_RELATION_TYPE;

    await prismadb.$transaction([
      prismadb.tourPackageRelation.deleteMany({
        where: {
          tourPackageId,
          relationType: finalRelationType,
        },
      }),
      ...sanitizedIds.map((relatedId, index) =>
        prismadb.tourPackageRelation.create({
          data: {
            tourPackageId,
            relatedTourPackageId: relatedId,
            relationType: finalRelationType,
            sortOrder: index,
          },
        })
      ),
    ]);

    return NextResponse.json({ success: true, relatedIds: sanitizedIds });
  } catch (error) {
    console.log("[TOUR_PACKAGE_RELATED_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
