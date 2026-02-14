# CLAUDE.md - Aagam Travel CRM Admin

## Project Overview

This is **Aagam Travel CRM**, a Next.js 13 (App Router) admin dashboard for managing tour packages, customer inquiries, hotel inventory, financial operations, and WhatsApp business messaging. It serves as a full-featured travel agency CRM with multi-domain support (main admin, ops staff, associate partners).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 13.5.7 (App Router) |
| Language | TypeScript 5.1 (strict mode) |
| UI | Shadcn/ui + Radix UI + Tailwind CSS 3.3 |
| Database | MySQL (main, via Prisma) + PostgreSQL (WhatsApp, via Prisma) |
| ORM | Prisma 5.22 with two separate clients |
| Auth | Clerk 4.31 |
| State | Zustand (client-side modals/UI) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Tables | TanStack React Table |
| PDF | jsPDF + Puppeteer (server-side rendering) |
| AI | OpenAI + Google Generative AI |
| Payments | Stripe |
| Messaging | WhatsApp Business API (Meta) |
| Storage | Cloudinary, Cloudflare R2, AWS S3 |

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Sign-in/sign-up routes (Clerk)
│   │   ├── (dashboard)/        # Main admin dashboard routes
│   │   ├── (root)/             # Root redirect logic
│   │   ├── api/                # API routes (184 route.ts files)
│   │   ├── ops/                # Operational staff routes
│   │   ├── layout.tsx          # Root layout (ClerkProvider, ThemeProvider, Sidebar)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Shadcn/ui primitives (button, dialog, form, etc.)
│   │   ├── forms/              # Business-logic form components
│   │   ├── modals/             # Modal components
│   │   ├── notifications/      # Toast/alert components
│   │   ├── ai/                 # AI-powered components
│   │   ├── whatsapp/           # WhatsApp chat/campaign components
│   │   ├── tour-package-query/ # Tour query components
│   │   ├── dialogs/            # Dialog components
│   │   └── app-sidebar.tsx     # Main navigation sidebar
│   ├── hooks/                  # Zustand stores and custom hooks (13 files)
│   ├── lib/                    # Utilities, helpers, and service logic
│   │   ├── prismadb.ts         # Re-export of root prismadb singleton
│   │   ├── whatsapp.ts         # Core WhatsApp API integration
│   │   ├── pricing-calculator.ts # Dynamic pricing engine
│   │   ├── gst-utils.ts        # GST/tax calculations
│   │   └── ...                 # 35+ utility files
│   ├── providers/              # React context providers
│   │   ├── modal-provider.tsx
│   │   ├── theme-provider.tsx
│   │   └── toast-provider.tsx
│   ├── actions/                # Server actions
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Additional utilities
│   └── middleware.ts           # Clerk auth + domain-based routing
├── lib/
│   └── prismadb.ts             # Primary Prisma singleton (MySQL)
├── schema.prisma               # Main database schema (MySQL, 61+ models)
├── prisma/
│   └── whatsapp-schema.prisma  # WhatsApp database schema (PostgreSQL)
├── scripts/                    # Utility/migration scripts (157 files)
├── docs/                       # Project documentation (160+ files)
├── public/                     # Static assets
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Commands

```bash
# Development
npm run dev              # Start dev server (next dev)
npm run build            # Generate both Prisma clients + next build
npm run start            # Start production server
npm run lint             # Run ESLint (next lint)

# Database
npx prisma generate                                      # Generate main MySQL client
npx prisma generate --schema=prisma/whatsapp-schema.prisma # Generate WhatsApp PostgreSQL client
npx prisma db push                                       # Push main schema to MySQL
npx prisma db push --schema=prisma/whatsapp-schema.prisma  # Push WhatsApp schema to PostgreSQL
npx prisma studio                                        # Open Prisma Studio for main DB

# Utility scripts
npm run cleanup-database          # Run daily auto-cleanup
npm run check-db-health           # Check database health
npm run seed-whatsapp-templates   # Seed WhatsApp message templates
npm run sync-whatsapp-templates   # Sync templates with Meta
```

## Architecture & Key Patterns

### Dual Database Architecture

The project uses **two separate Prisma clients**:
- **Main client** (`@prisma/client`): MySQL database for all core business data. Schema at `/schema.prisma`. Singleton in `/lib/prismadb.ts`.
- **WhatsApp client** (`@prisma/whatsapp-client`): PostgreSQL database for WhatsApp messaging data. Schema at `/prisma/whatsapp-schema.prisma`. Singleton in `src/lib/whatsapp-prismadb.ts`.

The main Prisma client uses `relationMode = "prisma"` (not foreign keys), meaning referential integrity is handled at the application level.

### Authentication & Authorization

- **Clerk** handles all authentication via `authMiddleware` in `src/middleware.ts`.
- Domain-based access control:
  - `ops.aagamholidays.com` — operational staff (limited routes)
  - `associate.aagamholidays.com` — associate partners (restricted to inquiries, tour queries, and related APIs)
  - Default domain — full admin access
- Public routes: `/sign-in`, `/sign-up`, `/tourPackageQueryDisplay/*`, `/tourPackageQueryPDFGenerator/*`
- The WhatsApp webhook (`/api/whatsapp/webhook`) bypasses auth entirely for Meta callbacks.
- Puppeteer (HeadlessChrome user-agent) bypasses auth for server-side PDF generation.

### API Route Pattern

All API routes live under `src/app/api/` and export standard HTTP method handlers:

```typescript
// src/app/api/[resource]/route.ts
export async function GET(req: Request) { ... }
export async function POST(req: Request) { ... }

// src/app/api/[resource]/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) { ... }
export async function PATCH(req: Request, { params }: { params: { id: string } }) { ... }
export async function DELETE(req: Request, { params }: { params: { id: string } }) { ... }
```

API routes authenticate via `auth()` from `@clerk/nextjs` and return JSON responses.

### State Management

- **Server state**: Prisma queries in server components and API routes.
- **Client state**: Zustand stores in `src/hooks/` for modal visibility, notifications, and UI state. Pattern:

```typescript
import { create } from 'zustand';
interface ModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}
export const useModal = create<ModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

### Form Pattern

Forms use React Hook Form with Zod schemas for validation:

```typescript
const formSchema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof formSchema>;
const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });
```

### Component Conventions

- UI primitives from Shadcn/ui live in `src/components/ui/`.
- Business components use Shadcn primitives and follow the pattern of a form component per resource (e.g., `hotel-form.tsx`, `inquiry-form.tsx`).
- The `cn()` utility from `src/lib/utils.ts` merges Tailwind classes: `cn("base-class", conditional && "extra-class")`.

### Layout & Provider Tree

```
ClerkProvider
  └── ThemeProvider (next-themes, class-based dark mode)
        ├── ToastProvider (react-hot-toast)
        ├── ModalProvider
        ├── DebugLogPanel
        └── SidebarProvider (Shadcn sidebar)
              ├── AppSidebar
              └── {children}
```

### PDF Generation

Two approaches are used:
1. **Client-side**: jsPDF + jspdf-autotable for simple table-based PDFs.
2. **Server-side**: Puppeteer renders HTML pages to PDF. Public display routes (`/tourPackageQueryDisplay/*`) serve as the source HTML. PDF caching is implemented in `src/lib/pdf-cache.ts`.

### Pricing System

A multi-factor dynamic pricing engine in `src/lib/pricing-calculator.ts` considers:
- Date/seasonal periods
- Occupancy type, room type, meal plan
- Vehicle type for transport
- Package variants with hotel-specific mappings
- Component-based pricing breakdown

## Key Domain Modules

### Tour Packages & Queries
Routes: `/tourPackages`, `/tourPackageQuery`, `/tourPackageDisplay`
Models: `TourPackage`, `TourPackageQuery`, `PackageVariant`, `VariantHotelMapping`
Features: multi-day itineraries, variant system, dynamic pricing, PDF generation, query-to-booking workflow.

### Inquiries
Routes: `/inquiries`
Models: `Inquiry`, `InquiryAction`
Features: customer inquiry tracking, staff assignment, action logging, associate partner workflow.

### Financial Management
Routes: `/purchases`, `/sales`, `/payments`, `/receipts`, `/expenses`, `/incomes`, `/bankaccounts`, `/cashaccounts`, `/ledger`
Models: `PurchaseDetail`, `SaleDetail`, `PaymentDetail`, `ReceiptDetail`, `ExpenseDetail`, `IncomeDetail`, `BankAccount`, `CashAccount`
Features: double-entry style tracking, GST/TDS tax management, bank reconciliation, financial ledger.

### WhatsApp Integration
Routes: `/whatsapp/*`, `/api/whatsapp/*`
Database: Separate PostgreSQL via `@prisma/whatsapp-client`
Features: Meta Business API integration, template management, campaigns, flow builder, catalog management, customer segmentation.

### Hotels & Inventory
Routes: `/hotels`, `/hotel-pricing`, `/room-types`, `/meal-plans`, `/occupancy-types`
Models: `Hotel`, `HotelPricing`, `RoomType`, `MealPlan`, `OccupancyType`
Features: rate management by date/season, room allocation, bulk import.

## Environment Variables

### Required

```
DATABASE_URL=                           # MySQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=      # Clerk public key
CLERK_SECRET_KEY=                       # Clerk secret key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Optional / Feature-specific

```
WHATSAPP_DATABASE_URL=                  # PostgreSQL for WhatsApp
WHATSAPP_BUSINESS_ACCOUNT_ID=           # Meta WhatsApp Business
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=      # Image hosting
AWS_ACCESS_KEY_ID=                      # S3/R2 storage
AWS_SECRET_ACCESS_KEY=
R2_ENDPOINT=                            # Cloudflare R2
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
OPENAI_API_KEY=                         # AI features
GOOGLE_GENERATIVE_AI_KEY=
STRIPE_API_KEY=                         # Payment processing
STRIPE_WEBHOOK_SECRET=
FRONTEND_STORE_URL=                     # Frontend store URL
NEXT_PUBLIC_APP_URL=                    # This app's URL
```

## TypeScript & Path Aliases

- **Strict mode** is enabled.
- Path alias: `@/*` maps to `./src/*`. Always use `@/` imports for source files.
- Target: ES5. Module: ESNext with Node resolution.

## Coding Conventions

- **Imports**: Use `@/` path alias for all `src/` imports (e.g., `import prismadb from "@/lib/prismadb"`).
- **Styling**: Tailwind CSS utility classes. Use `cn()` for conditional class merging. Dark mode via `class` strategy.
- **Dates**: Use `date-fns` for formatting. The `formatSafeDate()` utility in `src/lib/utils.ts` handles timezone-safe date formatting.
- **Currency**: Use `formatPrice()` from `src/lib/utils.ts` which defaults to INR with Indian number formatting.
- **API responses**: Return `NextResponse.json()` with appropriate HTTP status codes.
- **Error handling**: API routes wrap logic in try/catch and return `500` with `"Internal error"` message.
- **Database IDs**: UUID strings (`@id @default(uuid())`).
- **Schema location**: Main schema is at the project root (`/schema.prisma`), not in `/prisma/`.

## Build & Deployment

- **Build command**: `prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build`
- **Deployment target**: Vercel (with `outputFileTracingIncludes` for Prisma clients in serverless functions).
- **Image domains**: Cloudinary, Unsplash, Azure Blob, OpenAI, Cloudflare R2 are configured in `next.config.js`.
- **Prisma binary targets**: `native` and `rhel-openssl-3.0.x` (for Linux deployment environments).

## Common Gotchas

- The main Prisma schema is at the **project root** (`/schema.prisma`), not in `/prisma/`. The WhatsApp schema is in `/prisma/whatsapp-schema.prisma`.
- The `src/lib/prismadb.ts` file is a re-export of `/lib/prismadb.ts` (the actual singleton). Both paths work for imports.
- `relationMode = "prisma"` means no database-level foreign keys. Cascading deletes and referential integrity must be handled in application code.
- Two Prisma clients must both be generated before the app can build (the `build` script handles this).
- The WhatsApp webhook endpoint must remain public and excluded from auth middleware for Meta callbacks.
- Puppeteer-based PDF generation requires the HeadlessChrome user-agent bypass in middleware.
