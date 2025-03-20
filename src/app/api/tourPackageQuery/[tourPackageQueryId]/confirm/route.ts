import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function PATCH(
  req: Request,
  { params }: { params: { queryId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.queryId) {
      return new NextResponse("Query ID is required", { status: 400 });
    }

    // Get existing query to toggle isFeatured
    const existingQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.queryId },
    });

    if (!existingQuery) {
      return new NextResponse("Query not found", { status: 404 });
    }

    // Toggle isFeatured value (if true set to false, if false set to true)
    const updatedQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.queryId
      },
      data: {
        isFeatured: !existingQuery.isFeatured
      }
    });

    return NextResponse.json(updatedQuery);
  } catch (error) {
    console.error('[QUERY_CONFIRM]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
