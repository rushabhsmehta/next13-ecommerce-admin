# CLAUDE.md

## Project Overview

Travel & tourism admin platform. Serves as CMS, admin dashboard, and API layer for managing tour packages, customer inquiries, hotel bookings, and financial transactions. Built on Next.js 13 App Router.

## Tech Stack

- **Framework:** Next.js 13.5.7 (App Router), React 18, TypeScript
- **Database:** MySQL (main) + PostgreSQL (WhatsApp) via Prisma ORM
- **Auth:** Clerk (`@clerk/nextjs`)
- **UI:** Shadcn/Radix UI + Tailwind CSS
- **State:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Media:** Cloudinary, Cloudflare R2 (S3-compatible)
- **Payments:** Stripe
- **AI:** OpenAI, Google Gemini
- **PDF:** jsPDF, @react-pdf/renderer, Puppeteer
- **MCP:** Custom travel-admin MCP server (`mcp-server/`) for Claude tool integrations

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Generate Prisma clients + Next.js build
npm run lint         # ESLint (next/core-web-vitals)
npm start            # Production server
```

## Project Structure

```
src/
  app/
    (auth)/              # Sign-in/sign-up routes
    (dashboard)/         # Admin dashboard (50+ modules)
      accounts/          # Financial dashboard (overview, bank/cash balances)
      sales/             # Sales management with filters + balance tracking
      purchases/         # Purchase management with filters + balance tracking
      customers/         # Customer management
      hotels/            # Hotel management
      tourPackages/      # Tour package management
      tourPackageQuery/  # Tour inquiry/quote management
      payments/          # Payment tracking
      receipts/          # Receipt tracking
      expenses/          # Expense tracking (includes accrued)
      incomes/           # Income tracking
      reports/           # Analytics & reporting
      fetchaccounts/     # Per-query financial breakdown (tabbed view)
    (root)/              # Public homepage
    api/                 # API routes (60+ endpoints)
      mcp/               # MCP server API endpoint
    travel/              # Public-facing travel app
    ops/                 # Operations staff routes
  components/
    ui/                  # Shadcn UI components
    forms/               # Form components (expense, receipt, payment dialogs)
    whatsapp/            # WhatsApp UI components
  lib/                   # Utilities (pricing, GST, phone, PDF, etc.)
    prismadb.ts          # Main Prisma client singleton
    utils.ts             # formatPrice(), cn(), and general utilities
    timezone-utils.ts    # dateToUtc() for UTC date handling
    phone-utils.ts       # normalizePhoneNumber()
  hooks/                 # React hooks
  providers/             # Context providers (theme, modal, toast)
  types/                 # TypeScript type definitions
  middleware.ts          # Auth & routing middleware
schema.prisma            # Main MySQL schema (~1,700 lines)
prisma/
  whatsapp-schema.prisma # PostgreSQL WhatsApp schema
mcp-server/              # Custom MCP server for Claude integrations
  src/server.ts          # Tool registration orchestrator (103 tools)
  src/tools/             # 17 tool registration modules
  src/helpers.ts         # callTool + toolError helpers
  src/api-client.ts      # Calls Next.js /api/mcp endpoint
```

## Database

Two Prisma schemas with separate clients:

- **`schema.prisma`** (MySQL) - Main business data: tour packages, hotels, itineraries, financial transactions, customers, inquiries. Client: `@prisma/client`
- **`prisma/whatsapp-schema.prisma`** (PostgreSQL) - WhatsApp messages, campaigns, catalogs, orders. Client: `@prisma/whatsapp-client`

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

## MCP Tools (travel-admin)

**103 tools** available via the custom MCP server (expanded from 20 in Mar 2026):

### Architecture (Modular - Mar 2026 Refactor)
- **`src/app/api/mcp/route.ts`** — Slim gateway (90 lines): auth, dispatch, error handling
- **`src/app/api/mcp/handlers/`** — 17 handler modules (2200+ lines of Prisma queries)
- **`src/app/api/mcp/lib/`** — Shared utilities: errors, schemas, resolvers, date helpers
- **`mcp-server/src/tools/`** — 17 tool registration modules (2100+ lines of MCP tool definitions)
- **`mcp-server/src/server.ts`** — Slim orchestrator (45 lines)

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
| **WhatsApp Integration** | 10 | `send_whatsapp_message`, `send_whatsapp_template`, `list_whatsapp_campaigns`, `get_whatsapp_campaign_stats`, `list_whatsapp_customers`, `create_whatsapp_customer`, `list_whatsapp_templates`, `list_whatsapp_messages`, `send_whatsapp_campaign`, `get_whatsapp_database_health` |
| **AI & Dashboard** | 2 | `generate_itinerary`, `get_stats` |

## Key Patterns

- **Domain-based access:** Main domain = full admin, `ops.*` = operations, `associate.*` = limited partner access
- **Roles:** OWNER, ADMIN, FINANCE, OPERATIONS, VIEWER (organization-based)
- **API routes** are in `src/app/api/` following Next.js App Router conventions
- **Server components** are the default; client components use `"use client"` directive
- **Currency:** INR — use `formatPrice()` from `@/lib/utils`

## Sidebar Structure (Finance Section)

Accounts Overview → Sales → Purchases → Incomes → Expenses → Accrued Expenses → Sale Returns → Purchase Returns → Ledgers (Sales, Purchase, Receipt, Payment, Expense, Income) → Customer Statements → Supplier Statements → Cash Book → Bank Book

File: `src/components/app-sidebar.tsx`

## Environment Variables

Required variables (see `.env` for full list):

- `DATABASE_URL` - MySQL connection string
- `WHATSAPP_DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Auth
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Image hosting
- `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` - Payments
- `OPENAI_API_KEY` - AI tour generation
- `META_WHATSAPP_PHONE_NUMBER_ID` / `META_WHATSAPP_ACCESS_TOKEN` - WhatsApp

## Linting & TypeScript

- ESLint extends `next/core-web-vitals`
- TypeScript strict mode enabled
- No Prettier config; formatting relies on ESLint
