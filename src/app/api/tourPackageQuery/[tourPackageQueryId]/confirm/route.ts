import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Query ID is required", { status: 400 });
    }

    // Get existing query to toggle isFeatured
    const existingQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: {
        inquiry: true  // Include the related inquiry
      }
    });

    if (!existingQuery) {
      return new NextResponse("Query not found", { status: 404 });
    }

    // Toggle isFeatured value (if true set to false, if false set to true)
    const newFeaturedStatus = !existingQuery.isFeatured;
    
    const updatedQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId
      },
      data: {
        isFeatured: newFeaturedStatus
      }
    });

    // If query is being confirmed (isFeatured set to true) and has a related inquiry,
    // update the inquiry status to CONFIRMED
    if (newFeaturedStatus && existingQuery.inquiryId) {
      console.log(`[QUERY_CONFIRM] Updating related inquiry ${existingQuery.inquiryId} status to CONFIRMED`);
      
      await prismadb.inquiry.update({
        where: { id: existingQuery.inquiryId },
        data: { status: "CONFIRMED" }
      });
      
      // Optional: Add an action record for the status change
      await prismadb.inquiryAction.create({
        data: {
          inquiryId: existingQuery.inquiryId,
          actionType: "STATUS_CHANGE",
          remarks: "Status updated to CONFIRMED automatically when tour package query was confirmed."
        }
      });
    }

    return NextResponse.json(updatedQuery);
  } catch (error) {
    console.error('[QUERY_CONFIRM]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
