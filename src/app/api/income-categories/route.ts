import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const existingCategory = await prismadb.incomeCategory.findUnique({
      where: {
        name
      }
    });

    if (existingCategory) {
      return new NextResponse("Category with this name already exists", { status: 400 });
    }

    const incomeCategory = await prismadb.incomeCategory.create({
      data: {
        name,
        description
      }
    });

    return NextResponse.json(incomeCategory);
  } catch (error) {
    console.log('[INCOME_CATEGORY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const categories = await prismadb.incomeCategory.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.log('[INCOME_CATEGORIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

