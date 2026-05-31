---
name: new-api-route
description: Scaffold a new API route with Clerk auth (session or bearer), Prisma operations, and error handling following this project's patterns.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <route-path> [methods]
---

# Scaffold a New API Route

Create a new API route at `src/app/api/$0/route.ts`.

## Input

- **$0** — Route path (e.g., `transfers`, `suppliers/[supplierId]`, `mobile/inquiries`)
- **$1** — HTTP methods (optional, defaults to GET + POST)

## Live Project State

Existing API routes:
```
!`ls -d src/app/api/*/ 2>/dev/null | sed 's|.*/api/||' | head -30`
```

Mobile surface:
```
!`ls -d src/app/api/mobile/*/ 2>/dev/null | head -20`
```

## Steps

1. **Choose auth pattern**
   - **Dashboard / cookie session:** `const { userId } = await auth()` from `@clerk/nextjs/server`
   - **Mobile / bearer:** `getRequestClerkUserId(req)` from `@/lib/clerk-request-user.ts` (Clerk JWT or `MOBILE_DEV_AUTH_BYPASS_*`)
   - **Finance mutations:** `requireFinanceOrAdmin(userId)` from `@/lib/authz.ts` (throws `FORBIDDEN` for `handleApi`)
   - **Inquiries:** use `resolveInquiryAccessContext()` from `@/lib/inquiry-access.ts` — org members from DB, not Clerk API per request

2. **Prefer newer routes** — `handleApi()` from `@/lib/api-response.ts`:
   - Add `export const dynamic = "force-dynamic"` for mutable reads/writes
   - Zod validation; throw `FORBIDDEN` / `NOT_FOUND` or let ZodError map to 422
   - Use `jsonError(message, status, code?, details?)` for explicit errors

3. **Legacy pattern** (~200 routes) — still valid for small additions:
   - try/catch, `console.log("[PREFIX_METHOD]", error)`, `new NextResponse("Internal error", { status: 500 })`

4. **Proxy / middleware** (`src/proxy.ts`)
   - `/api/mobile/*` and `/api/chat/*` skip Clerk session middleware
   - `/api/inquiries*` with valid bearer skips session redirect (native apps have no cookies)
   - If adding a bearer-only CRM route, consider the same pattern or a dedicated `/api/mobile/*` wrapper

5. **Implement handlers** — Prisma via `@/lib/prismadb`, dates via `dateToUtc()`, balances in `$transaction` when touching `BankAccount` / `CashAccount`

## Conventions

- Log prefix: `[UPPERCASE_ROUTE_METHOD]` e.g. `[INQUIRIES_POST]`, `[CUSTOMERS_PATCH]`
- Dynamic routes: `export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> })` (Next.js 16 async params)
- Prefer `select` over heavy `include` on list endpoints
- Mobile clients may send `X-Mobile-App-Variant` — log only, never authorize from it

## Additional resources

- [references/route-template.md](references/route-template.md) — legacy + `handleApi` + bearer examples
