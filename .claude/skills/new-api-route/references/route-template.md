# API Route Template

## Standard CRUD Route (route.ts)

```tsx
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

// GET - List all items
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const items = await prismadb.model.findMany({
      include: { /* relations */ },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.log("[MODULE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST - Create new item
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = await req.json();
    const { field1, field2 } = body;

    if (!field1) return new NextResponse("Field1 is required", { status: 400 });

    const item = await prismadb.model.create({
      data: { field1, field2 },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.log("[MODULE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

## Dynamic Route ([id]/route.ts)

```tsx
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

// GET - Get single item
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const item = await prismadb.model.findUnique({
      where: { id: params.id },
      include: { /* relations */ },
    });

    if (!item) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(item);
  } catch (error) {
    console.log("[MODULE_GET_ID]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH - Update item
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = await req.json();

    const item = await prismadb.model.update({
      where: { id: params.id },
      data: { ...body },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.log("[MODULE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// DELETE - Delete item
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    await prismadb.model.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MODULE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

## Balance-Updating Route Pattern

When modifying BankAccount/CashAccount balances, use a Prisma transaction:

```tsx
const result = await prismadb.$transaction(async (tx) => {
  const record = await tx.model.create({ data: { ... } });

  if (bankAccountId) {
    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { currentBalance: { increment: amount } }, // or decrement
    });
  }

  if (cashAccountId) {
    await tx.cashAccount.update({
      where: { id: cashAccountId },
      data: { currentBalance: { increment: amount } },
    });
  }

  return record;
});
```
