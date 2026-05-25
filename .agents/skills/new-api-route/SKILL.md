---
name: new-api-route
description: Scaffold a new API route with Clerk auth, Prisma operations, and error handling following this project's patterns.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <route-path> [methods]
---

# Scaffold a New API Route

Create a new API route at `src/app/api/$0/route.ts`.

## Input

- **$0** — Route path (e.g., "transfers", "suppliers/[supplierId]")
- **$1** — HTTP methods (optional, defaults to GET + POST)

## Live Project State

Existing API routes:
```
!`ls -d src/app/api/*/ 2>/dev/null | sed 's|.*/api/||' | head -30`
```

## Steps

1. **Create the route file** at `src/app/api/$0/route.ts`
2. **For each HTTP method**, implement a handler that:
   - Authenticates with `const { userId } = await auth()` from `@clerk/nextjs/server`
   - Returns `new NextResponse("Unauthenticated", { status: 403 })` if no userId
   - Parses request body with `await req.json()` (POST/PATCH)
   - Extracts URL params from the function signature (dynamic routes)
   - Validates required fields, returning `new NextResponse("Field required", { status: 400 })`
   - Performs Prisma operations via `prismadb`
   - Returns `NextResponse.json(result)` on success
   - Catches errors with `console.log("[ROUTE_NAME_METHOD]", error)` and returns 500

## Conventions

- Log prefix format: `[UPPERCASE_ROUTE_METHOD]` e.g., `[CUSTOMERS_POST]`, `[TRANSFERS_PATCH]`
- For dynamic routes: `export async function PATCH(req: Request, { params }: { params: { id: string } })`
- Use `@/lib/prismadb` for database access
- Use `@/lib/timezone-utils` for date conversions with `dateToUtc()`
- If the route modifies `BankAccount` or `CashAccount` balances, update `currentBalance` in the same transaction

## Additional resources

- For the route template, see [references/route-template.md](references/route-template.md)
