import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = await req.json();
    const { name, contact, email } = body;
    if (!name) return new NextResponse("Name is required", { status: 400 });

    // Create new customer entry
    const customer = await prismadb.customer.create({
      data: { name, contact, email },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[CUSTOMERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const customers = await prismadb.customer.findMany({
      select: { id: true, name: true, contact: true, email: true, createdAt: true },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.log("[CUSTOMERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
