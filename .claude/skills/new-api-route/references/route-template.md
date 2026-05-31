# API Route Template

## Preferred: handleApi + finance guard

```tsx
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, jsonError } from "@/lib/api-response";
import { auth } from "@clerk/nextjs/server";
import { requireFinanceOrAdmin } from "@/lib/authz";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403);
    await requireFinanceOrAdmin(userId);

    const body = createSchema.parse(await req.json());
    const item = await prismadb.model.create({
      data: { name: body.name, amount: body.amount, date: dateToUtc(body.date) },
    });
    return NextResponse.json(item);
  });
}
```

## Bearer / mobile (no session cookie)

```tsx
import { NextResponse } from "next/server";
import { handleApi, jsonError } from "@/lib/api-response";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthenticated", 403);

    const access = await resolveInquiryAccessContext(userId);
    if (!access.canCreate) return jsonError("Forbidden", 403, "FORBIDDEN");

    const body = await req.json();
    const inquiry = await prismadb.inquiry.create({ data: { /* ... */ } });
    return NextResponse.json(inquiry);
  });
}
```

## Legacy CRUD (still common)

```tsx
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const items = await prismadb.model.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.log("[MODULE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

## Dynamic route (Next.js 16 async params)

```tsx
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

## Balance-updating transaction

```tsx
const result = await prismadb.$transaction(async (tx) => {
  const record = await tx.receiptDetail.create({ data: { /* ... */ } });
  await tx.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance: { increment: amount } },
  });
  return record;
});
```

## Mobile-only wrapper

Prefer thin routes under `src/app/api/mobile/<feature>/` that delegate to shared lib functions used by dashboard routes, keeping one source of truth for business rules.
