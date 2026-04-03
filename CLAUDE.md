# CLAUDE.md

## Project Overview

Travel & tourism admin platform. Serves as CMS, admin dashboard, and API layer for managing tour packages, customer inquiries, hotel bookings, and financial transactions. Built on Next.js App Router.

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
```

## Project Structure

```
/
├── schema.prisma            # Main MySQL schema (70,000+ lines, 90+ models)
├── prisma/
│   └── whatsapp-schema.prisma   # PostgreSQL WhatsApp schema
├── mcp-server/              # Custom MCP server for Claude integrations
├── scripts/                 # Node.js utility scripts (WhatsApp, DB maintenance)
├── docs/                    # Documentation files
├── mobile/                  # Mobile app (excluded from TypeScript)
└── src/
    ├── app/
    │   ├── (auth)/          # Sign-in/sign-up routes (Clerk)
    │   ├── (dashboard)/     # Admin dashboard (50+ modules)
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
    │   │       ├── purchase-returns/ & sale-returns/
    │   │       ├── reports/
    │   │       ├── suppliers/
    │   │       ├── tourPackages/
    │   │       ├── tourPackageCreateCopy/ & tourPackageQueryCreateCopy/
    │   │       ├── tourPackageQuery/
    │   │       ├── tourPackageQueryDisplay/ & tourPackageQueryVariantDisplay/
    │   │       ├── transfers/
    │   │       ├── travel-users/
    │   │       └── whatsapp/
    │   ├── (root)/          # Public homepage
    │   ├── api/             # API routes (48+ top-level endpoints, 194+ total routes)
    │   │   └── mcp/         # MCP gateway + OAuth + 18 handler modules
    │   ├── mcp/             # MCP authorization routes (OAuth PKCE)
    │   ├── ops/             # Operations staff routes
    │   └── travel/          # Public-facing travel app (destinations, packages, chat)
    ├── components/
    │   ├── ui/              # Shadcn UI components (44+ components)
    │   ├── forms/           # Transaction form dialogs (expense, receipt, payment)
    │   ├── tour-package-query/  # Tour query UI (variants, pricing, itinerary)
    │   ├── ai/              # AI wizard components
    │   ├── dialogs/         # Dialog components
    │   ├── modals/          # Modal components
    │   ├── notifications/   # Notification components
    │   ├── whatsapp/        # WhatsApp UI components
    │   ├── app-sidebar.tsx  # Main navigation sidebar
    │   ├── GenerateMyPDF.tsx / ViewMyPDF.tsx   # PDF generation/viewing
    │   ├── voucher-layout.tsx / voucher-actions.tsx  # Voucher UI
    │   └── financial-summary-panel.tsx
    ├── lib/                 # Utilities
    │   ├── prismadb.ts      # Main Prisma client singleton
    │   ├── whatsapp-prismadb.ts  # WhatsApp Prisma client
    │   ├── utils.ts         # formatPrice(), formatSafeDate(), cn()
    │   ├── timezone-utils.ts    # dateToUtc() for UTC date handling
    │   ├── phone-utils.ts       # normalizePhoneNumber()
    │   ├── authz.ts             # getUserOrgRole(), roleAtLeast(), requireFinanceOrAdmin()
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
    │   ├── whatsapp.ts                  # WhatsApp integration (86KB)
    │   ├── transaction-service.ts       # Financial transaction processing
    │   └── tour-package-query-accounting*.ts  # Accounting module (schema, helpers, persistence, route)
    ├── hooks/               # React hooks (modals, notifications, mobile detection)
    ├── providers/           # Context providers (theme, modal, toast)
    ├── types/               # TypeScript type definitions (TransactionFormProps, etc.)
    └── middleware.ts        # Auth & routing middleware (Clerk)
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

```tsx
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    const body = await req.json();
    // Validate, then create/update
    const result = await prismadb.model.create({ data: { ... } });
    return NextResponse.json(result);
  } catch (error) {
    console.log("[ROUTE_NAME_METHOD]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

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

## Authorization

Roles are stored in `OrganizationMember` model: `VIEWER`, `OPERATIONS`, `FINANCE`, `ADMIN`, `OWNER` (ordered by privilege).

Key helpers in `src/lib/authz.ts`:
- `getUserOrgRole(userId, organizationId?)` — returns user's role
- `roleAtLeast(role, minimum)` — checks if role meets minimum level
- `requireFinanceOrAdmin(userId, organizationId?)` — throws `FORBIDDEN` if not FINANCE/ADMIN/OWNER

## MCP Tools (travel-admin)

**102 tools** available via the custom MCP server:

### Architecture (Modular)
- **`src/app/api/mcp/route.ts`** — Slim gateway: auth via `x-mcp-api-secret` header, dispatch, error handling
- **`src/app/api/mcp/handlers/`** — 18 handler modules + index.ts dispatcher (2200+ lines of Prisma queries)
- **`src/app/api/mcp/lib/`** — Shared utilities: `errors.ts`, `schemas.ts`, `resolve-account.ts`, `resolve-entity.ts`, `date-filter.ts`
- **`mcp-server/src/tools/`** — 17 tool registration modules (2100+ lines of MCP tool definitions)
- **`mcp-server/src/server.ts`** — Slim orchestrator (45 lines)
- **`mcp-server/src/http.ts`** — HTTP transport with OAuth 2.0 PKCE (17KB)
- **`mcp-server/src/contracts/`** — Shared type contracts between MCP server and Next.js app

### Tools by Category

| Category | Count | Tools |
|----------|-------|-------|
| **Locations & Setup** | 4 | `search_locations`, `list_tour_packages`, `list_hotels`, `list_destinations` |
| **Inquiries & Follow-ups** | 13 | `create_inquiry`, `list_inquiries`, `get_inquiry`, `update_inquiry_status`, `add_inquiry_note`, `assign_inquiry_staff`, `unassign_inquiry_staff`, `set_inquiry_follow_up`, `get_inquiry_actions`, `update_inquiry`, `delete_inquiry`, `list_follow_ups_due`, `get_inquiry_summary` |
| **Tour Queries & Lifecycle** | 7 | `create_tour_query`, `list_tour_queries`, `get_tour_query`, `confirm_tour_query`, `get_query_financial_summary`, `update_tour_query`, `archive_tour_query` |
| **Customers & Suppliers** | 10 | `list_customers`, `get_customer`, `create_customer`, `get_customer_outstanding`, `list_customer_sales`, `list_suppliers`, `get_supplier`, `create_supplier`, `get_supplier_outstanding`, `list_supplier_purchases` |
| **Sales & Purchases** | 8 | `list_sales`, `get_sale`, `create_sale`, `get_sale_balance`, `list_purchases`, `get_purchase`, `create_purchase`, `get_purchase_balance` |
| **Financial Transactions** | 13 | `list_accounts`, `get_account_transactions`, `get_financial_summary`, `create_payment`, `create_receipt`, `create_transfer`, `allocate_receipt_to_sale`, `allocate_payment_to_purchase`, `list_receipts`, `list_payments`, `list_transfers`, `get_outstanding_receivables`, `get_outstanding_payables` |
| **Expenses & Income** | 9 | `create_expense`, `delete_expense`, `create_income`, `list_expenses`, `list_incomes`, `list_expense_categories`, `list_income_categories`, `create_accrued_expense`, `pay_accrued_expense` |
| **Returns & Adjustments** | 4 | `create_sale_return`, `list_sale_returns`, `create_purchase_return`, `list_purchase_returns` |
| **Reporting & Analytics** | 10 | `get_profit_loss`, `get_customer_statement`, `get_supplier_statement`, `get_cash_book`, `get_bank_book`, `get_tds_summary`, `get_gst_summary`, `get_expense_breakdown`, `get_revenue_by_location`, `get_daily_collection_report` |
| **Configuration Lookups** | 4 | `list_room_types`, `list_meal_plans`, `list_vehicle_types`, `list_occupancy_types` |
| **Staff & Operations** | 2 | `list_operational_staff`, `list_associate_partners` |
| **Flights & Bookings** | 3 | `get_flight_ticket`, `list_flight_tickets`, `create_flight_ticket` |
| **Notifications** | 2 | `create_notification`, `list_notifications` |
| **Pricing Lookups** | 2 | `get_hotel_pricing`, `get_transport_pricing` |
| **WhatsApp Integration** | 13 | `send_whatsapp_message`, `send_whatsapp_template`, `upload_whatsapp_template_media`, `send_whatsapp_product_message`, `send_whatsapp_product_list`, `list_whatsapp_campaigns`, `get_whatsapp_campaign_stats`, `list_whatsapp_customers`, `create_whatsapp_customer`, `list_whatsapp_templates`, `list_whatsapp_messages`, `send_whatsapp_campaign`, `get_whatsapp_database_health` |
| **AI & Dashboard** | 2 | `generate_itinerary`, `get_stats` |

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
| `associate-partners/`, `associate-performance/` | Partner management |
| `audit-logs/` | Audit trail |
| `bank-accounts/`, `cash-accounts/` | Account management |
| `customers/` | Customer CRUD (includes `[id]/open-sales/`) |
| `destinations/` | Destination management |
| `expense-categories/`, `expenses/` | Expense management (includes `expenses/accrued/`) |
| `financial-records/` | Financial record management |
| `flight-tickets/` | Flight ticket CRUD |
| `generate-pdf/` | PDF generation endpoint |
| `hotel-pricing/` | Hotel pricing config |
| `hotels/` | Hotel CRUD |
| `income-categories/`, `incomes/` | Income management |
| `inquiries/`, `inquiry-summary/` | Inquiry management |
| `itineraries/`, `itinerariesMaster/`, `itineraryMaster/` | Itinerary management |
| `locations/`, `locationBySlug/`, `locations-suppliers/` | Location management |
| `mcp/` | MCP gateway (auth + dispatch) |
| `meal-plans/`, `occupancy-types/`, `room-types/`, `vehicle-types/` | Config lookups |
| `notifications/` | Notification system |
| `operational-staff/` | Staff management |
| `package-variants/` | Package variant management |
| `payments/`, `receipts/`, `transfers/` | Financial transactions |
| `pricing-attributes/`, `pricing-components/` | Pricing configuration |
| `purchase-returns/`, `sale-returns/` | Returns management |
| `purchases/`, `sales/` | Transaction management (include balance sub-routes) |
| `sale-purchase-links/` | Link sales to purchases |
| `suppliers/` | Supplier CRUD |
| `tourPackages/`, `tourPackagesForWebsite/`, `tourPackageBySlug/` | Tour packages |
| `tourPackageQuery/` | Tour inquiries/quotes |
| `transport-pricing/` | Transport pricing |
| `travel-users/` | Travel app user management |
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

## Linting & TypeScript

- ESLint extends `next/core-web-vitals` (configured in `eslint.config.mjs`)
- TypeScript strict mode enabled
- No Prettier config; formatting relies on ESLint
- `tsconfig.json` excludes: `node_modules`, `mobile`, `scripts`, `prisma`, `.next`

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
