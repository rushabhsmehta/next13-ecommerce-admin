import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { name, contact, email } = body;

    // Validation
    if (!name) return new NextResponse("Name is required", { status: 400 });

    // Create new supplier entry
    const supplier = await prismadb.supplier.create({
      data: {
        name,
        contact,
        email,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Fetch all suppliers with all fields
    const suppliers = await prismadb.supplier.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.log("[SUPPLIERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
