import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    if (!params.supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const supplier = await prismadb.supplier.findUnique({
      where: { id: params.supplierId },
      select: { id: true, name: true, contact: true, email: true, createdAt: true },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.supplierId) return new NextResponse("Supplier ID is required", { status: 400 });

    const supplier = await prismadb.supplier.delete({
      where: { id: params.supplierId },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.supplierId) return new NextResponse("Supplier ID is required", { status: 400 });

    const body = await req.json();
    const { name, contact, email } = body;
    if (!name) return new NextResponse("Name is required", { status: 400 });

    const supplier = await prismadb.supplier.update({
      where: { id: params.supplierId },
      data: { name, contact, email },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
