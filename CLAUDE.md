# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Database Safety Rules

- **NEVER** drop the production database, drop tables, or run destructive Prisma commands (`prisma db push --force-reset`, `prisma migrate reset`, `prisma db execute` with DROP)
- Safe Prisma commands: `prisma format`, `prisma generate`, `prisma migrate dev` (creates a migration; never apply against prod without confirmation)
- Schema changes require migrations — confirm with the user and explain the impact before running them
- Test destructive operations only on local/dev DBs

## Project Overview

Travel & tourism admin platform. Serves as CMS, admin dashboard, and API layer for managing tour packages, customer inquiries, hotel bookings, and financial transactions. Built on Next.js 16 App Router with Clerk org RBAC, a custom MCP server (~139 tools), and three Expo mobile app variants (`public`, `staff`, `finance`).

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.4, TypeScript 5.9.3
- **Database:** MySQL (main) + PostgreSQL (WhatsApp) via Prisma ORM 5.22.0
- **Auth:** Clerk (`@clerk/nextjs@6.38.1`)
- **UI:** Shadcn/Radix UI + Tailwind CSS 3.4.19
- **State:** Zustand 4.5.7
- **Forms:** React Hook Form 7.71.2 + Zod 3.21.4
- **Tables:** TanStack React Table 8.21.3
- **Media:** Cloudinary, Cloudflare R2 (S3-compatible via @aws-sdk/client-s3)
- **Payments:** Stripe 17.7.0
- **AI:** OpenAI 4.93.0, Google Gemini (@google/generative-ai 0.24.1)
- **PDF:** jsPDF 3.0.1 + jspdf-autotable, @react-pdf/renderer 3.4.4, Puppeteer 22.15.0
- **Editor:** Jodit React (WYSIWYG), React DnD (drag-and-drop)
- **Excel:** xlsx 0.18.5
- **MCP:** Custom travel-admin MCP server (`mcp-server/`) for Claude tool integrations

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Generate both Prisma clients + Next.js build (--webpack)
npm run lint         # ESLint (next/core-web-vitals)
npm start            # Production server
npm run test:accounts # Run accounting module tests

# Utility scripts
npm run sync-whatsapp-templates   # Sync WhatsApp templates
npm run cleanup-database          # Auto-cleanup daily
npm run check-db-health           # Check database health
npm run vercel-build              # Prisma generation + Next.js build for Vercel
npm run postinstall               # Auto-runs Prisma generation after npm install
npm run seed-whatsapp-templates   # Seeds WhatsApp templates
npm run process-whatsapp-campaigns # Processes WhatsApp campaigns
```

## Project Structure

```
/
├── schema.prisma            # Main MySQL schema (~1,800 lines, 83 models)
├── prisma/
│   └── whatsapp-schema.prisma   # PostgreSQL WhatsApp schema
├── mcp-server/              # Custom MCP server for Claude integrations
├── scripts/                 # Node.js utility scripts (WhatsApp, DB maintenance)
├── docs/                    # Documentation files
├── flow-keys/              # RSA key pair for WhatsApp Flow encryption
├── tools/                  # Utility scripts (balance checks, data fixes)
├── types/                  # Standalone TypeScript type definitions
├── mobile/                  # Mobile app (excluded from TypeScript)
└── src/
    ├── app/
    │   ├── (auth)/          # Sign-in/sign-up routes (Clerk)
    │   ├── (dashboard)/     # Admin dashboard (53 modules)
    │   │   ├── (routes)/    # Route group sub-container
    │   │   │   ├── associate-partners/
    │   │   │   ├── audit-logs/
    │   │   │   ├── bank-book/       # Bank reconciliation
    │   │   │   ├── cash-book/       # Cash reconciliation
    │   │   │   ├── export-contacts/
    │   │   │   ├── inquiries/       # Inquiry management & follow-ups
    │   │   │   ├── operational-staff/
    │   │   │   ├── settings/        # Config: meal-plans, room-types, vehicle-types,
    │   │   │   │                    #   occupancy-types, pricing-attributes, pricing-components
    │   │   │   ├── tourpackagequeryfrominquiry/  # Convert inquiry to tour query
    │   │   │   │   └── associate/   # Associate partner version (tabbed form)
    │   │   │   └── transport-pricing/
    │   │   └── Direct dashboard modules:
    │   │       ├── accounts/        # Financial overview (bank/cash balances)
    │   │       ├── activities/ & activitiesMaster/
    │   │       ├── bankaccounts/ & cashaccounts/
    │   │       ├── chat-management/
    │   │       ├── customers/
    │   │       ├── destinations/
    │   │       ├── expense-categories/ & expenses/
    │   │       ├── fetchaccounts/   # Per-query financial breakdown (tabbed)
    │   │       ├── flight-tickets/
    │   │       ├── hotel-pricing/
    │   │       ├── hotels/
    │   │       ├── income-categories/ & incomes/
    │   │       ├── itineraries/ & itinerariesMaster/
    │   │       ├── ledger/
    │   │       ├── locations/ & locations-suppliers/
    │   │       ├── payments/, purchases/, receipts/, sales/
    │   │       ├── purchase-returns/     # Includes supplier-credits/ sub-route
    │   │       ├── sale-returns/         # Includes credit-notes/ sub-route
    │   │       ├── reports/
    │   │       ├── suppliers/
    │   │       ├── tds/               # Tax deducted at source
    │   │       ├── todos/             # Todo / task management
    │   │       ├── tourPackages/
    │   │       ├── tourPackageCreateCopy/ & tourPackageQueryCreateCopy/
    │   │       ├── tourPackageDisplay/ & tourPackageQuery/
    │   │       ├── tourPackageFromTourPackageQuery/ & tourPackageQueryFromTourPackage/
    │   │       ├── tourPackagePDFGenerator/ & tourPackageQueryPDFGenerator/
    │   │       ├── tourPackagePDFGeneratorWithVariants/ & tourPackageQueryPDFGeneratorWithVariants/
    │   │       ├── tourPackageQueryDisplay/ & tourPackageQueryVariantDisplay/
    │   │       ├── tourPackageQueryHotelUpdate/
    │   │       ├── tourPackageQueryVoucherDisplay/
    │   │       ├── transfers/
    │   │       ├── travel-users/
    │   │       ├── viewpdfpage/
    │   │       └── whatsapp/
    │   ├── (root)/          # Public homepage
    │   ├── access-denied/   # RBAC access-denied page
    │   ├── api/             # API routes (79 top-level endpoints)
    │   │   ├── mcp/         # MCP gateway + 18 handler modules
    │   │   ├── mobile/      # Mobile (Expo) admin/ops/travel API surface
    │   │   ├── associate/   # Associate partner API (auth, inquiries, me)
    │   │   ├── travel-auth/ # Travel-app user auth + profile
    │   │   └── todos/       # Todo CRUD
    │   ├── mcp/             # MCP authorization routes (OAuth PKCE)
    │   ├── ops/             # Operations staff routes (inquiry workflow)
    │   └── travel/          # Public-facing travel app (destinations, packages, chat, account)
    ├── components/
    │   ├── ui/              # Shadcn UI components (58 components)
    │   ├── forms/           # Transaction form dialogs (expense, receipt, payment)
    │   ├── tour-package-query/  # Tour query UI (variants, pricing, itinerary)
    │   ├── ai/              # AI wizard components
    │   ├── dialogs/         # Dialog components
    │   ├── modals/          # Modal components
    │   ├── notifications/   # Notification components
    │   ├── whatsapp/        # WhatsApp UI components
    │   ├── app-sidebar.tsx  # Main navigation sidebar
    │   ├── app-shell.tsx    # Dashboard shell layout
    │   ├── main-nav.tsx / user-nav.tsx / settings-nav.tsx  # Top-bar nav
    │   ├── GenerateMyPDF.tsx / ViewMyPDF.tsx   # PDF generation/viewing
    │   ├── voucher-layout.tsx / voucher-actions.tsx  # Voucher UI
    │   └── financial-summary-panel.tsx
    ├── lib/                 # Utilities
    │   ├── prismadb.ts      # Main Prisma client singleton
    │   ├── whatsapp-prismadb.ts  # WhatsApp Prisma client
    │   ├── prisma-client.js     # JS shim re-exporting prismadb for tests
    │   ├── utils.ts         # formatPrice(), formatSafeDate(), cn()
    │   ├── timezone-utils.ts    # dateToUtc() for UTC date handling
    │   ├── phone-utils.ts       # normalizePhoneNumber()
    │   ├── authz.ts             # getUserOrgRole(), roleAtLeast(), requireFinanceOrAdmin()
    │   ├── clerk-request-user.ts # Resolve current user from request (bearer + cookie)
    │   ├── crm-route-access.ts / crm-route-access-rules.ts # CRM/dashboard route gating + Puppeteer bypass
    │   ├── inquiry-access.ts    # Inquiry visibility rules per role/associate
    │   ├── mobile-admin-access.ts # Mobile admin module visibility/status (incl. "in-development")
    │   ├── expo-push.ts         # Expo push-notification dispatch
    │   ├── rate-limit.ts        # Rate limiting utility
    │   ├── pricing-calculator.ts    # Variant pricing calculation service
    │   ├── gst-utils.ts             # GST calculation helpers
    │   ├── payment-utils.ts         # Payment processing utilities
    │   ├── seasonal-periods.ts      # Seasonal pricing periods
    │   ├── bank-balance.ts / cash-balance.ts
    │   ├── buildSyntheticSnapshots.ts   # Pricing snapshot generation
    │   ├── variant-snapshot.ts          # Variant snapshot management
    │   ├── inquiry-statuses.ts          # Centralized inquiry status constants
    │   ├── tds.ts                       # Tax deducted at source
    │   ├── r2-client.ts                 # Cloudflare R2 S3 client
    │   ├── pdf-cache.ts                 # PDF caching service
    │   ├── transaction-service.ts       # Financial transaction processing
    │   ├── transaction-schemas.ts       # Zod schemas for financial transactions
    │   ├── tour-package-query-accounting*.ts  # Accounting module (schema, helpers, persistence, route)
    │   ├── tour-package-query-finance-summary.ts  # Per-query financial roll-up
    │   ├── ai/                  # AI utility modules
    │   ├── pdf/                 # PDF generation utilities
    │   │   ├── branding.ts      # PDF branding utilities
    │   │   ├── styles.ts        # PDF styling utilities
    │   │   └── text-utils.ts    # PDF text utilities
    │   ├── utils/               # Additional utility modules
    │   │   ├── audit-logger.ts  # Audit logging utility
    │   │   └── csv-export.ts    # CSV export functionality
    │   ├── api-response.ts      # Standardized API response helpers
    │   ├── associate-utils.ts   # Associate partner utilities
    │   ├── constants.ts         # Application constants
    │   ├── env.ts               # Environment variable validation
    │   ├── hotel-pricing-import.ts / hotel-pricing-json.ts  # Hotel pricing data import
    │   ├── html-escape.ts / html-utils.ts  # HTML sanitization helpers
    │   ├── itinerary-image-html.ts  # Itinerary image HTML generation
    │   ├── meta-capi.ts         # Meta Conversions API integration
    │   ├── social-media.ts      # Social media utilities
    │   ├── stripe.ts            # Stripe client configuration
    │   ├── whatsapp.ts          # Core WhatsApp integration
    │   ├── whatsapp-campaign-worker.ts  # Campaign processing
    │   ├── whatsapp-catalog.ts / whatsapp-customers.ts / whatsapp-customer-csv.ts
    │   ├── whatsapp-flows.ts / whatsapp-media.ts / whatsapp-templates.ts
    │   └── whatsapp-prismadb.ts # WhatsApp Prisma client
    ├── hooks/               # React hooks (modals, notifications, mobile detection)
    ├── providers/           # Context providers (theme, modal, toast)
    ├── types/               # TypeScript type definitions (TransactionFormProps, etc.)
    └── proxy.ts             # Clerk auth & host-based routing (Next.js 16 proxy convention)
```

## Database

Two Prisma schemas with separate clients:

- **`schema.prisma`** (MySQL, root) — Main business data: tour packages, hotels, itineraries, financial transactions, customers, inquiries. Client: `@prisma/client`
- **`prisma/whatsapp-schema.prisma`** (PostgreSQL) — WhatsApp messages, campaigns, catalogs, orders, customers. Client: `@prisma/whatsapp-client`

Both clients are generated during `npm run build` and `postinstall`.

### Financial Data Model

Key models and relationships for the accounting system:

- **`SaleDetail`** — Customer invoices. Fields: `salePrice`, `gstAmount`, `invoiceNumber`, `status`. Has `receiptAllocations[]` (ReceiptSaleAllocation) tracking what's been collected.
- **`PurchaseDetail`** — Supplier bills. Fields: `price`, `gstAmount`, `billNumber`, `netPayable`. Has `paymentAllocations[]` (PaymentPurchaseAllocation) tracking what's been paid.
- **`ReceiptSaleAllocation`** — Links a receipt to a sale with `allocatedAmount`. Unique on `(receiptDetailId, saleDetailId)`.
- **`PaymentPurchaseAllocation`** — Links a payment to a purchase with `allocatedAmount`. Unique on `(paymentDetailId, purchaseDetailId)`.
- **`BankAccount`** / **`CashAccount`** — Hold `currentBalance` (updated by API routes on payment/receipt/transfer creation).

**Key calculations:**
- Outstanding receivables = `SUM(salePrice + gstAmount)` - `SUM(receiptAllocations.allocatedAmount)`
- Outstanding payables = `SUM(netPayable ?? price + gstAmount)` - `SUM(paymentAllocations.allocatedAmount)`

**Credit notes & supplier credits:**
- **Credit notes** (customer side) are tracked via `SaleReturn` fields: `creditNoteAmount`, `creditNoteNumber`, `creditType`. Managed through `sale-returns/credit-notes/` dashboard route and `credit-notes/` API.
- **Supplier credits** (supplier side) are tracked via `PurchaseReturn` fields: `supplierCreditType`, `supplierCreditExpiry`. Managed through `purchase-returns/supplier-credits/` dashboard route and `supplier-credits/` API.

### Tour Package Query Variants

`TourPackageQuery` supports multiple priced variants per query, persisted as JSON columns:

- `variantRoomAllocations` — `{ [variantId]: { [itineraryId]: [{ roomTypeId, occupancyTypeId, mealPlanId, quantity, guestNames?, voucherNumber? }] } }`
- `variantTransportDetails` — vehicle type / quantity / description per variant per day
- `variantPricingData` — `{ [variantId]: { totalCost, basePrice, appliedMarkup, breakdown: { accommodation, transport }, itineraryBreakdown[], calculatedAt } }`

Pricing is computed by `src/lib/pricing-calculator.ts` and exposed via `POST /api/pricing/calculate-variant`. The variant tab UI lives in `src/components/tour-package-query/QueryVariantsTab.tsx` with three calculation methods (Manual, Auto from hotel+transport pricing, Use tour-package pricing).

### Transaction ledgers

`src/lib/transaction-service.ts#calculateRunningBalance(transactions, openingBalance)` produces the running-balance shape used across bank, cash, customer, and supplier ledger views. Standardized types live in `types/index.ts` (`TransactionBase`, `FormattedTransaction`, `PurchaseFormProps`, etc.).

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Coding Conventions

### Page Pattern (Server → Client)

Dashboard pages follow a two-component pattern:

1. **Server component** (`page.tsx`) — Fetches data with `prismadb`, formats it, passes to client:
   ```tsx
   import prismadb from "@/lib/prismadb";
   import { ClientComponent } from "./components/client";

   export default async function Page() {
     const data = await prismadb.model.findMany({
       include: { relations },
       orderBy: { createdAt: "desc" },
     });
     const formatted = data.map((item) => ({ /* format for columns */ }));
     return (
       <div className="flex-col">
         <div className="space-y-4 p-4">
           <ClientComponent data={formatted} />
         </div>
       </div>
     );
   }
   ```

2. **Client component** (`components/*-client.tsx`) — Renders interactive UI with Shadcn components, `useRouter`, state hooks.

### API Route Pattern

Two patterns coexist; prefer the newer `handleApi` wrapper for new routes.

**Legacy pattern (~200 existing routes):** plain try/catch, log with bracketed prefix, return `NextResponse`.

```tsx
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    const body = await req.json();
    const result = await prismadb.model.create({ data: { /* ... */ } });
    return NextResponse.json(result);
  } catch (error) {
    console.log("[CUSTOMERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

**Newer pattern (`src/lib/api-response.ts`):** `handleApi()` auto-handles ZodError → 422, `FORBIDDEN`/`NOT_FOUND` codes thrown from helpers (e.g. `requireFinanceOrAdmin`), and unhandled errors → 500. Use `jsonError(message, status, code?, details?)` for explicit error responses.

```tsx
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic"; // required for routes returning mutable data

export async function POST(req: Request) {
  return handleApi(async () => {
    const body = await req.json();
    // ... validation, auth checks (throw FORBIDDEN/NOT_FOUND or ZodError)
    const result = await prismadb.model.create({ data: body });
    return NextResponse.json(result);
  });
}
```

- Add `export const dynamic = "force-dynamic"` to any route that reads/writes mutable data so Next.js doesn't statically cache it.
- Prefer Prisma `select: { ... }` over `include` to avoid over-fetching.

### Form Pattern

Forms use React Hook Form + Zod + Shadcn `<Form>`:
- Schema defined with `z.object()`
- `useForm()` with `zodResolver(formSchema)`
- API calls via `axios` with `toast.success()` / `toast.error()`
- Loading state managed with `useState`

### Error Logging

API routes log errors with a bracketed prefix: `console.log("[CUSTOMERS_POST]", error)`

### Currency & Formatting

- Always use `formatPrice()` from `@/lib/utils` for INR amounts
- Use `formatSafeDate()` from `@/lib/utils` for timezone-safe date display
- Use `dateToUtc()` from `@/lib/timezone-utils` when storing dates to DB

### Timezone Handling (Critical)

Date-only fields (`startDate`, `endDate`, `journeyDate`) previously shifted across timezones. Always go through `src/lib/timezone-utils.ts`:

- `dateToUtc(date)` — convert local date → UTC for DB storage (preserves date components, no day-shift)
- `utcToLocal(utcDate)` — DB UTC → local for display
- `normalizeApiDate(date)` — normalize incoming API dates (date-only stored as UTC midnight)
- `formatLocalDate(date, format)` — display formatting with TZ awareness
- `createDatePickerValue(value)` — feed react-day-picker without TZ shift

### Debug Logging

`src/components/DebugLogPanel.tsx` (mounted in root layout) intercepts `console.log/warn/error` and shows them in a dev-only panel. Prefix logs with emojis so the panel can categorize them:

```ts
console.log("🔍 [API] Fetching tour packages:", { locationId });
console.error("❌ [DB] Transaction failed:", error);
```

## Authorization & Multi-Domain Architecture

### Roles

Roles are stored in `OrganizationMember`: `VIEWER`, `OPERATIONS`, `FINANCE`, `ADMIN`, `OWNER` (ordered by privilege).

Helpers in `src/lib/authz.ts`:
- `getUserOrgRole(userId, organizationId?)` — returns user's role
- `roleAtLeast(role, minimum)` — checks if role meets minimum level
- `requireFinanceOrAdmin(userId, organizationId?)` — throws `FORBIDDEN` (caught by `handleApi`) if not FINANCE/ADMIN/OWNER

### Domain-based access (`src/proxy.ts`)

The same Next.js app serves three audiences distinguished by hostname:

- **Admin** (main domain) — full nav (`NAV_ITEMS` in `src/components/app-sidebar.tsx`)
- **Associate** (`associate.aagamholidays.com`) — limited, mostly read-only nav (`ASSOCIATE_NAV_ITEMS`). Use `isCurrentUserAssociate()` / `getCurrentAssociatePartner()` from `src/lib/associate-utils.ts` to gate mutations. Associate matches Clerk user email against `AssociatePartner.gmail` or `email`.
- **Ops** (`ops.aagamholidays.com`) — operational staff workflows under `src/app/ops/`

The Clerk proxy skips `auth.protect()` for ignored routes (e.g. `/api/whatsapp/webhook`) and for paths matched by `isPublicRoute` / `isIgnoredRoute` in `src/proxy.ts`. Internal PDF automation relaxes **org RBAC** (not Clerk at the edge) when the user-agent matches HeadlessChrome/Puppeteer — see `isCrmPdfAutomationRequest()` in `src/lib/crm-route-access.ts`. Test permission/navigation changes on both admin and associate domains.

### Per-route access rules

- `src/lib/crm-route-access-rules.ts` — client-safe path-to-roles map plus `canAccessDashboardPath()`. Imported by `app-sidebar.tsx` (via `useCrmOrgRole()` from `src/providers/crm-role-provider.tsx`) so the sidebar hides items the user can't reach.
- `src/lib/crm-route-access.ts` — server-only counterpart used by API routes; also exports `isCrmPdfAutomationRequest()`.
- `src/lib/inquiry-access.ts` — narrows inquiry queries per role / associate partner.
- `src/lib/mobile-admin-access.ts` — drives the mobile admin module list, including the `in-development` status that hides modules from production users.
- `src/lib/clerk-request-user.ts` — resolves the current user from either a Clerk session cookie or a bearer token (mobile/Expo).

### Mobile API surface

The Expo mobile app calls `/api/mobile/*` rather than the dashboard routes. The surface is segmented by audience:

- `admin/`, `operations/`, `ops-portal/`, `travel-app-admin/` — role-gated screens for staff
- `me/`, `profile/`, `auth-status/`, `users/` — auth/session
- `customers/`, `enquiry/`, `my-inquiries/`, `tour-queries/`, `tour-packages/`, `flight-tickets/`, `todos/` — core CRM
- `finance/`, `reports/` — read-only financial views
- `push/` — Expo push registration / dispatch (`src/lib/expo-push.ts`)
- `whatsapp/`, `ai/`, `website/`, `settings/`, `associate-partners/` — feature endpoints

## MCP Tools (travel-admin)

**~139 tools** registered via the custom MCP server (count with `grep -rn 'server\.tool(' mcp-server/src/tools/`).

### Architecture (Modular)
- **`src/app/api/mcp/route.ts`** — Slim gateway: auth via `x-mcp-api-secret` header, dispatch, error handling
- **`src/app/api/mcp/handlers/`** — 18 handler modules + `index.ts` dispatcher (Prisma queries by category)
- **`src/app/api/mcp/lib/`** — Shared utilities: `errors.ts`, `schemas.ts`, `resolve-account.ts`, `resolve-entity.ts`, `date-filter.ts`
- **`mcp-server/src/tools/`** — 17 tool registration modules (one per category)
- **`mcp-server/src/server.ts`** — Slim orchestrator that wires all tool modules
- **`mcp-server/src/http.ts`** — HTTP transport with OAuth 2.0 PKCE
- **`mcp-server/src/api-client.ts`** — HTTP client that calls the Next.js MCP gateway
- **`mcp-server/src/helpers.ts`** — Shared helpers used by tool modules
- **`mcp-server/src/contracts/`** — Shared type contracts between MCP server and Next.js app

### Tools by Category (module → representative tools)

| Module (`mcp-server/src/tools/*.ts`) | Sample tools |
|--------------------------------------|--------------|
| `ai.ts` | `generate_itinerary` |
| `config.ts` | `list_room_types`, `list_meal_plans`, `list_vehicle_types`, `list_occupancy_types` |
| `customers.ts` | `list_customers`, `get_customer`, `create_customer`, `get_customer_outstanding`, `list_customer_sales` |
| `suppliers.ts` | `list_suppliers`, `get_supplier`, `create_supplier`, `get_supplier_outstanding`, `list_supplier_purchases` |
| `sales.ts` | `list_sales`, `get_sale`, `create_sale`, `get_sale_balance` |
| `purchases.ts` | `list_purchases`, `get_purchase`, `create_purchase`, `get_purchase_balance` |
| `finance.ts` | `list_accounts`, `get_account_transactions`, `get_financial_summary`, `create_payment`, `create_receipt`, `create_transfer`, `allocate_receipt_to_sale`, `allocate_payment_to_purchase`, `list_payments`, `list_receipts`, `list_transfers`, `get_outstanding_receivables`, `get_outstanding_payables` |
| `expenses-income.ts` | `create_expense`, `delete_expense`, `list_expenses`, `list_expense_categories`, `create_income`, `list_incomes`, `list_income_categories`, `create_accrued_expense`, `pay_accrued_expense` |
| `returns.ts` | `create_sale_return`, `list_sale_returns`, `create_purchase_return`, `list_purchase_returns` |
| `reporting.ts` | `get_profit_loss`, `get_customer_statement`, `get_supplier_statement`, `get_cash_book`, `get_bank_book`, `get_tds_summary`, `get_gst_summary`, `get_expense_breakdown`, `get_revenue_by_location`, `get_daily_collection_report` |
| `inquiries.ts` | `create_inquiry`, `list_inquiries`, `get_inquiry`, `update_inquiry_status`, `add_inquiry_note`, `assign_inquiry_staff`, `get_inquiry_actions`, `get_inquiry_summary`, `delete_inquiry` |
| `tour-queries.ts` | `create_tour_query`, `list_tour_queries`, `get_tour_query`, `update_tour_query`, `confirm_tour_query`, `archive_tour_query`, `add_tour_query_variant`, `get_query_financial_summary`, `get_tour_query_pdf` |
| `locations.ts` | `search_locations`, `list_destinations`, `list_tour_packages`, `get_tour_package`, `list_hotels`, `get_hotel_pricing`, `create_hotel_pricing`, `update_hotel_pricing`, `delete_hotel_pricing`, `get_transport_pricing`, `create_transport_pricing`, `update_transport_pricing`, `delete_transport_pricing` |
| `flights.ts` | `get_flight_ticket`, `list_flight_tickets`, `create_flight_ticket` |
| `staff.ts` | `list_operational_staff`, `list_associate_partners` |
| `stats.ts` | `get_stats` |
| `whatsapp.ts` | `send_whatsapp_message`, `send_whatsapp_template`, `send_whatsapp_media`, `send_whatsapp_product_message`, `send_whatsapp_product_list`, `send_whatsapp_campaign`, `list_whatsapp_campaigns`, `get_whatsapp_campaign_stats`, `list_whatsapp_customers`, `create_whatsapp_customer`, `list_whatsapp_templates`, `list_whatsapp_template_schema`, `create_whatsapp_template`, `delete_whatsapp_template`, `generate_whatsapp_template_example`, `preview_whatsapp_template`, `preview_whatsapp_template_from_components`, `preview_whatsapp_template_from_saved`, `validate_whatsapp_template`, `upload_whatsapp_media`, `upload_whatsapp_template_media`, `list_whatsapp_messages`, `search_whatsapp_messages`, `get_whatsapp_conversation`, `get_whatsapp_conversation_summary`, `get_whatsapp_database_health`, `get_whatsapp_catalog`, `sync_whatsapp_catalog`, `list_whatsapp_catalog_packages`, `get_whatsapp_catalog_package`, `create_whatsapp_catalog_package`, `update_whatsapp_catalog_package`, `delete_whatsapp_catalog_package`, `sync_whatsapp_catalog_package`, `send_whatsapp_catalog_package`, `send_whatsapp_catalog_packages`, `send_whatsapp_packages_by_location`, `list_catalogue_packages_by_location`, `sync_tour_package_to_catalogue` |

## Key Patterns

- **Domain-based access:** Main domain = full admin, `ops.*` = operations staff, `associate.*` = limited partner access
- **Roles:** OWNER > ADMIN > FINANCE > OPERATIONS > VIEWER (organization-based, checked via `authz.ts`)
- **API routes** are in `src/app/api/` following Next.js App Router conventions
- **Server components** are the default; client components use `"use client"` directive
- **Currency:** INR — use `formatPrice()` from `@/lib/utils`
- **Webpack alias:** `.js` imports resolve to `.ts/.tsx` (enables MCP contracts sharing)

## API Routes Reference

Top-level routes in `src/app/api/`:

| Endpoint | Purpose |
|----------|---------|
| `activities/`, `activitiesMaster/` | Activity management |
| `ai/` | AI-powered features (itinerary generation, etc.) |
| `associate/` | Associate-domain auth/inquiries/me endpoints |
| `associate-partners/`, `associate-performance/` | Partner management |
| `audit-logs/` | Audit trail |
| `bank-accounts/`, `cash-accounts/` | Account management |
| `chat/` | Chat functionality |
| `config/` | Application configuration |
| `credit-notes/` | Credit note management |
| `customers/` | Customer CRUD (includes `[id]/open-sales/`) |
| `destinations/` | Destination management |
| `expense-categories/`, `expenses/` | Expense management (includes `expenses/accrued/`) |
| `export/` | Data export endpoints |
| `financial-records/` | Financial record management |
| `flight-tickets/` | Flight ticket CRUD |
| `generate-pdf/` | PDF generation endpoint |
| `hotel-pricing/` | Hotel pricing config |
| `hotels/` | Hotel CRUD |
| `income-categories/`, `incomes/` | Income management |
| `inquiries/`, `inquiry-summary/` | Inquiry management |
| `internal/` | Internal system endpoints |
| `itineraries/`, `itinerariesMaster/`, `itineraryMaster/` | Itinerary management |
| `locations/`, `locationBySlug/`, `locations-suppliers/`, `searchTermLocations/` | Location management |
| `mcp/` | MCP gateway (auth + dispatch) |
| `me/` | Current user info |
| `meal-plans/`, `occupancy-types/`, `room-types/`, `vehicle-types/` | Config lookups |
| `mobile/` | Mobile (Expo) API surface: `admin/`, `ai/`, `associate-partners/`, `auth-status/`, `customers/`, `enquiry/`, `finance/`, `flight-tickets/`, `me/`, `my-inquiries/`, `operations/`, `ops-portal/`, `profile/`, `push/`, `reports/`, `settings/`, `todos/`, `tour-packages/`, `tour-queries/`, `travel-app-admin/`, `users/`, `website/`, `whatsapp/` |
| `notifications/` | Notification system |
| `operational-staff/` | Staff management |
| `ops/` | Operations staff endpoints |
| `package-variants/` | Package variant management |
| `payments/`, `receipts/`, `transfers/` | Financial transactions |
| `pricing/`, `pricing-attributes/`, `pricing-components/` | Pricing configuration |
| `purchase-returns/`, `sale-returns/` | Returns management |
| `purchases/`, `sales/` | Transaction management (include balance sub-routes) |
| `push/` | Push notification endpoints |
| `report/` | Report generation |
| `sale-purchase-links/` | Link sales to purchases |
| `settings/` | Application settings |
| `supplier-credits/` | Supplier credit management |
| `suppliers/` | Supplier CRUD |
| `tds/` | Tax deducted at source |
| `todos/` | Todo / task CRUD |
| `tourPackages/`, `tourPackagesForWebsite/`, `tourPackageBySlug/` | Tour packages |
| `tourPackageQuery/` | Tour inquiries/quotes |
| `transport-detail/` | Transport detail API |
| `transport-pricing/` | Transport pricing |
| `travel/` | Public-facing travel API |
| `travel-auth/` | Travel-app user auth + profile |
| `travel-users/` | Travel app user management |
| `uploads/` | File upload endpoints |
| `vehicle-types/` | Vehicle type lookup API (standalone) |
| `whatsapp/` | WhatsApp messages, campaigns, catalogs |

## Sidebar Structure (Finance Section)

Accounts Overview → Sales → Purchases → Incomes → Expenses → Accrued Expenses → Sale Returns → Purchase Returns → Ledgers (Sales, Purchase, Receipt, Payment, Expense, Income) → Customer Statements → Supplier Statements → Cash Book → Bank Book

File: `src/components/app-sidebar.tsx`

## Environment Variables

Required variables (see `.env` for full list):

- `DATABASE_URL` — MySQL connection string
- `WHATSAPP_DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Auth
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Image hosting
- `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` — Payments
- `OPENAI_API_KEY` — AI tour generation
- `META_WHATSAPP_PHONE_NUMBER_ID` / `META_WHATSAPP_ACCESS_TOKEN` — WhatsApp
- `MCP_API_SECRET` — Secret for MCP gateway authentication
- `R2_*` — Cloudflare R2 credentials (bucket, access key, secret, endpoint)
- `CRON_SECRET` — Cron job authentication
- `WHATSAPP_FLOW_PRIVATE_KEY` / `WHATSAPP_FLOW_KEY_PASSPHRASE` — WhatsApp Flow encryption

## Linting & TypeScript

- ESLint extends `next/core-web-vitals` (configured in `eslint.config.mjs`)
- TypeScript strict mode enabled
- No Prettier config; formatting relies on ESLint
- `tsconfig.json` excludes: `node_modules`, `mobile`, `scripts`, `prisma`, `.next`

## PDF Generation & Vercel

- Puppeteer pipeline lives in `src/utils/generatepdf.ts`. In production it uses `@sparticuz/chromium-min` for serverless. Use `inlineImagesInHtml()` to convert remote header/footer images to data URIs (Puppeteer can't load remote images in margin templates) and `createProfessionalFooter(companyInfo)` for branded footers.
- PDF-related dashboard routes are covered by `createRouteMatcher` public paths in `src/proxy.ts` where appropriate. `isCrmPdfAutomationRequest()` in `src/lib/crm-route-access.ts` skips **org RBAC** for Puppeteer/HeadlessChrome requests on those paths so internal PDF jobs can render.
- `vercel.json` sets `maxDuration: 30` for `src/app/api/**` and `PRISMA_CLIENT_ENGINE_TYPE=binary` at build time. Multi-line env vars (e.g. `WHATSAPP_FLOW_PRIVATE_KEY`) must include the full `-----BEGIN/END-----` markers in Vercel.

## Mobile App (Expo)

Three installed apps from one `mobile/` codebase (`APP_VARIANT=public|staff|finance`). Excluded from the root TypeScript project. Stack: Expo SDK 55, RN 0.83, Expo Router, `@clerk/clerk-expo`, Jest + Testing Library (unit), Detox (E2E Android), `expo-secure-store` (auth), `expo-sqlite` (offline cache, 5-min TTL).

| Variant | App name | Metro port | Package |
|---------|----------|------------|---------|
| `public` | Aagam Holidays | 8081 | `com.aagamholidays.app` |
| `staff` | Aagam Operations | 8082 | `com.aagamholidays.staff` |
| `finance` | Aagam Accounts | 8083 | `com.aagamholidays.finance` |

```bash
# Web repo root
npm run test:mobile-inquiry-crud   # Inquiry API CRUD smoke test (dev bypass)

# Mobile (cd mobile — npm install first)
npm run start:public / start:staff / start:finance
npm run android:public / android:staff / android:finance
npm run test:public / test:staff / test:finance
npm run generate:icons             # Regenerate launcher icons (all variants)
npm run test:inquiry:adb           # USB inquiry CRUD (needs adb)
```

Shared screens: `mobile/app/`; variant route roots re-export in `mobile/apps/{public,staff,finance}/`. API calls via `mobile/lib/api.ts` (bearer token, retries). Backend RBAC is authoritative — `X-Mobile-App-Variant` is audit-only. Dev bypass: `MOBILE_DEV_AUTH_BYPASS_*` in server `.env.local` (never production). See `AGENTS.md` and `mobile/docs/app-variants.md` for full variant rules, adb reverse, and testIDs.

Mobile conventions: every interactive element needs a `testID`; `accessibilityRole`/`accessibilityLabel`/`accessibilityHint` are required; chat polling is adaptive (3s active / 10s inactive / 30s background).

## Agent Skills

Skills live in `.agents/skills/` (mirrored in `.claude/skills/`). Invoke by name when relevant. After editing skills, sync: `node scripts/sync-agent-skills.mjs`

| Skill | Use when |
|-------|----------|
| `new-api-route` | Adding `src/app/api/*` routes |
| `new-page` | Dashboard server/client pages |
| `new-form` | RHF + Zod forms |
| `financial-context` | Sales, purchases, receipts, payments, ledgers |
| `generate-voucher-pdf` | PDF vouchers |
| `new-voucher-page` | Voucher view pages |
| `export-report-xlsx` | Branded Excel exports |
| `new-mcp-tool` | MCP tool + gateway handler |
| `prisma-migrate` | Schema migrations |
| `schedule-report` | Cron report endpoints |
| `check` | lint, tsc, build |
| `mobile-variant` | Expo variant apps, icons, adb/USB testing |

## Git Workflow

- Always develop on a feature branch (never commit directly to `main`/`master`)
- Commit and push all changes before ending a session
- Branch naming convention: `claude/<feature-slug-XXXXX>` (e.g. `claude/add-export-button-4KmNp`)
- Use descriptive commit messages; append the session URL at the end
- Never force-push, never skip hooks (`--no-verify`)

## Working Style

- Confirm before taking risky or irreversible actions (destructive git ops, schema changes, deleting files)
- Keep changes minimal and focused — don't refactor beyond the scope of the task
- Read existing code before suggesting modifications
