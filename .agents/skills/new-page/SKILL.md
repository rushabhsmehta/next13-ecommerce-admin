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

## Input

- **$0** — Module name (e.g., "transfers", "suppliers") — becomes the route folder name
- **$1** — Prisma model name (optional — check `schema.prisma` if not provided)

## Live Project State

Existing dashboard modules:
```
!`ls -d src/app/\(dashboard\)/*/ 2>/dev/null | sed 's|.*/\(dashboard\)/||' | head -30`
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
4. **Verify** the Prisma model exists in `schema.prisma` and includes are correct

## Patterns to include based on complexity

**Simple list page** (default): `Heading` + `DataTable` with search + columns + cell actions

**Page with filters** (if data needs filtering): Add `useState` + `useMemo` filtering:
- Search input, date range pickers, dropdown selects
- `useMemo` to filter data based on state
- "Clear filters" button

**Page with exports** (if data is exportable): Add toolbar with CSV/Excel download buttons:
- `toolbar` prop passed to `DataTable`
- `useMemo` to compute `exportRows`
- Use `xlsx` library for Excel, `exportToCSV` from `@/lib/utils/csv-export.ts` for CSV

**Page with tabs** (if data has categories): Wrap DataTable in `Tabs` / `TabsList` / `TabsContent` for segmentation

## Conventions

- Use `@/` path aliases for all imports
- Format dates as `"MMMM do, yyyy"` unless otherwise specified
- Format currency with `formatPrice()` from `@/lib/utils`
- Computed fields (balances, payment status) go in the client component, not pre-computed in server
- Error logging uses `console.log("[MODULE_NAME]", error)` pattern

## Additional resources

- For page/client/columns templates, see [references/page-template.md](references/page-template.md)
- For cell-action and advanced patterns, see [references/advanced-patterns.md](references/advanced-patterns.md)
