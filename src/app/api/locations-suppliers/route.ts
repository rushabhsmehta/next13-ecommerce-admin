import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// Get all locations with their associated suppliers
export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "location";

    if (view === "location") {
      // Group by locations
      const locations = await prismadb.location.findMany({
        include: {
          suppliers: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  contact: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          label: 'asc'
        }
      });

      return NextResponse.json(locations);
    } else {
      // Group by suppliers
      const suppliers = await prismadb.supplier.findMany({
        include: {
          locations: {
            include: {
              location: {
                select: {
                  id: true,
                  label: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return NextResponse.json(suppliers);
    }
  } catch (error) {
    console.log("[LOCATIONS_SUPPLIERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
