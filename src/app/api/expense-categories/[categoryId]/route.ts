import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    if (!params.categoryId) {
      return new NextResponse("Category ID is required", { status: 400 });
    }

    const category = await prismadb.expenseCategory.findUnique({
      where: {
        id: params.categoryId
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log('[EXPENSE_CATEGORY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { name, description, isActive } = body;

    if (!params.categoryId) {
      return new NextResponse("Category ID is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const category = await prismadb.expenseCategory.update({
      where: {
        id: params.categoryId
      },
      data: {
        name,
        description,
        isActive
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log('[EXPENSE_CATEGORY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.categoryId) {
      return new NextResponse("Category ID is required", { status: 400 });
    }

    const category = await prismadb.expenseCategory.delete({
      where: {
        id: params.categoryId
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log('[EXPENSE_CATEGORY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
