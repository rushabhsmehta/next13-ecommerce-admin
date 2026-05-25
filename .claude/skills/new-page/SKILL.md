---
name: new-page
description: Scaffold a new dashboard page module with server component, client component, and DataTable columns following this project's patterns.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <module-name> [prisma-model]
---

# Scaffold a New Dashboard Page

Create a new dashboard page module at `src/app/(dashboard)/$0/`.

For **mobile staff/finance screens**, use the `mobile-variant` skill — shared UI under `mobile/app/`, re-exported from `mobile/apps/{staff,finance}/`.

## Input

- **$0** — Module name (e.g., `transfers`, `suppliers`) — becomes the route folder name
- **$1** — Prisma model name (optional — check `schema.prisma` if not provided)

## Live Project State

Existing dashboard modules:
```
!`ls -d src/app/\(dashboard\)/*/ 2>/dev/null | sed 's|.*/\(dashboard\)/||' | head -30`
```

Route access rules (sidebar gating):
```
!`head -40 src/lib/crm-route-access-rules.ts 2>/dev/null`
```

## Steps

1. **Create the route folder** at `src/app/(dashboard)/$0/`
2. **Create `page.tsx`** (server component) that:
   - Imports `prismadb` from `@/lib/prismadb`
   - Imports the client component from `./components/client`
   - Fetches data with `prismadb.<model>.findMany()` with appropriate `include` and `orderBy`
   - Formats data for the client (dates with `format()` from date-fns, prices with `formatPrice()`)
   - Wraps the client component in `<div className="flex-col"><div className="space-y-4 p-4">`
3. **Create `components/` subfolder** with:
   - **`client.tsx`** — `"use client"` component that receives formatted data as props, renders a `Heading` + `Separator` + `DataTable` using Shadcn components
   - **`columns.tsx`** — Column definitions for the DataTable using `ColumnDef<>` from `@tanstack/react-table`
   - **`cell-action.tsx`** — Row actions dropdown with Copy ID, Edit, Delete (with `AlertModal` confirmation)
4. **RBAC** — If the module is finance-only or role-restricted, add path rules in `src/lib/crm-route-access-rules.ts` and server checks in API routes (`requireFinanceOrAdmin`, `getUserOrgRole`)
5. **Verify** the Prisma model exists in `schema.prisma` and includes are correct

## Patterns to include based on complexity

**Simple list page** (default): `Heading` + `DataTable` with search + columns + cell actions

**Page with filters**: `useState` + `useMemo` filtering, date range pickers, "Clear filters"

**Page with exports**: toolbar with CSV/Excel — see `export-report-xlsx` skill

**Page with tabs**: `Tabs` / `TabsList` / `TabsContent` for segmentation

**Voucher view**: use `new-voucher-page` skill (`VoucherLayout` + `VoucherActions`)

## Conventions

- Use `@/` path aliases for all imports
- Format dates as `"MMMM do, yyyy"` unless otherwise specified
- Format currency with `formatPrice()` from `@/lib/utils`
- Computed fields (balances, payment status) go in the client component, not pre-computed in server
- Error logging uses `console.log("[MODULE_NAME]", error)` pattern
- PDF automation: Puppeteer requests may bypass org RBAC via `isCrmPdfAutomationRequest()` — do not rely on this for user-facing auth

## Additional resources

- [references/page-template.md](references/page-template.md)
- [references/advanced-patterns.md](references/advanced-patterns.md)
