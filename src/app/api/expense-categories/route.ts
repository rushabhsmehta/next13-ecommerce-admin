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
    const { name, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const existingCategory = await prismadb.expenseCategory.findUnique({
      where: {
        name
      }
    });

    if (existingCategory) {
      return new NextResponse("Category with this name already exists", { status: 400 });
    }

    const expenseCategory = await prismadb.expenseCategory.create({
      data: {
        name,
        description
      }
    });

    return NextResponse.json(expenseCategory);
  } catch (error) {
    console.log('[EXPENSE_CATEGORY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const categories = await prismadb.expenseCategory.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.log('[EXPENSE_CATEGORIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

