# Copilot Instructions

## 🚨 CRITICAL DATABASE SAFETY RULES
- **NEVER delete or drop the production database or any tables**
- **NEVER run destructive Prisma commands**: `prisma db push --force-reset`, `prisma migrate reset`, `prisma db execute` with DROP statements
- **Safe commands only**: `prisma format`, `prisma generate`, `prisma migrate dev` (creates migrations)
- Always use migrations for schema changes - never direct database modifications
- Before schema changes, confirm with user and explain exactly what will happen to the database
- Test destructive operations only on local/development databases, never on production

## 🏗️ Architecture & Project Structure

### Next.js 13 App Router Layout
- **Route groups**: `src/app/(auth)`, `(dashboard)`, `(root)`, `/ops` for domain-specific workflows
- **Root layout** (`src/app/layout.tsx`): Wraps app with `ClerkProvider` → `ThemeProvider` → `SidebarProvider` → `AppSidebar` + `DebugLogPanel`
- **Dashboard pages**: `src/app/(dashboard)/**` - server components fetch Prisma data, pass to client components in co-located `/components` directories
- **Path alias**: `@/*` → `./src/*` (see `tsconfig.json`)

### Multi-Domain & Multi-Tenant Architecture
- **Admin domain**: Full access to all `NAV_ITEMS` (see `src/components/app-sidebar.tsx`)
- **Associate domain** (`associate.aagamholidays.com`): Read-only access via middleware restrictions
  - Check `src/middleware.ts` for domain detection and route blocking
  - Use `isCurrentUserAssociate()` from `src/lib/associate-utils.ts` before enabling mutations
  - Associates get `ASSOCIATE_NAV_ITEMS` (inquiries, tour packages view-only)
- **Ops domain** (`ops.aagamholidays.com`): Operational staff workflows with auth enforcement
- Middleware bypasses auth for: webhooks (`/api/whatsapp/webhook`), Puppeteer (HeadlessChrome user-agent), public routes

## 🗄️ Database & Prisma Patterns

### Dual-Schema Setup
- **Main schema**: `schema.prisma` (~1500 lines) - tour packages, inquiries, finance, locations, hotels
- **WhatsApp schema**: `prisma/whatsapp-schema.prisma` - messages, sessions, automations, campaigns
- **Build command**: `npx prisma generate && npx prisma generate --schema=prisma/whatsapp-schema.prisma` (runs on install and build)
- **Client singleton**: Import from `@/lib/prismadb` (re-exports `lib/prismadb.ts` with connection pooling and shutdown handlers)

### Key Models & Relations
- **Location** (1:M) → **TourPackage**, **Hotel**, **Activity**, **Itinerary**, **SeasonalPeriods**
- **TourPackage** → multi-variant pricing, hotel mappings, seasonal periods
- **Inquiry** → **TourPackageQuery** (journey dates, customer details, room allocations)
- **Financial Records**: interconnected models for purchases, sales, expenses, incomes, receipts, payments with `FormattedTransaction` and `calculateRunningBalance()`

## 🔐 Authentication & Authorization

### Clerk Integration
- Primary auth provider via `@clerk/nextjs`
- Check `auth()` and `currentUser()` from `@clerk/nextjs` in server components/API routes
- Auth guards in `src/lib/authz.ts`: `getUserOrgRole()`, `roleAtLeast()`, `requireFinanceOrAdmin()`
- Associate partner detection: `getCurrentAssociatePartner()` matches Clerk user email to `AssociatePartner.gmail` or `email` field

### Middleware Patterns (`src/middleware.ts`)
```typescript
// Bypass auth for webhooks
ignoredRoutes: ["/api/whatsapp/webhook"]
// Bypass for Puppeteer PDF generation
beforeAuth: check for "HeadlessChrome" user-agent
// Domain-specific restrictions in afterAuth
```

## 🌐 API Routes Best Practices

### Standard API Pattern (`src/app/api/**/route.ts`)
```typescript
import { handleApi, jsonError } from '@/lib/api-response';

export const dynamic = 'force-dynamic'; // REQUIRED for mutable data

export async function POST(req: Request) {
  return handleApi(async () => {
    const body = await req.json();
    // ... validation, auth checks
    const result = await prismadb.model.create({ data: body });
    return NextResponse.json(result);
  });
}
```
- **Error handling**: `handleApi()` wraps try/catch, auto-handles Zod validation errors
- **Error responses**: Use `jsonError(message, status, code?, details?)` for consistent format
- **Dynamic flag**: Add `export const dynamic = 'force-dynamic'` to prevent Next.js from caching API responses
- **Select over include**: Prefer `select: { field1: true }` to avoid over-fetching relations

## 📅 Timezone Handling (CRITICAL)

### Central Utilities (`src/lib/timezone-utils.ts`)
- **`dateToUtc(date)`**: Convert local date to UTC for database storage (preserves date components)
- **`utcToLocal(utcDate)`**: Convert UTC date from DB to local display (extracts UTC components → local date)
- **`normalizeApiDate(date)`**: Ensure date consistency in API requests (date-only fields stored as UTC midnight)
- **`formatLocalDate(date, format)`**: Display formatting with timezone awareness
- **`createDatePickerValue(dateValue)`**: Prepare dates for react-day-picker without timezone shift

### Usage Patterns
```typescript
// API routes: accept dates from client
const startDate = dateToUtc(body.startDate); // Store as UTC
await prismadb.tourPackageQuery.create({ data: { startDate } });

// Display/formatting
formatLocalDate(query.startDate, 'PPP'); // "Jan 15, 2025"
formatSafeDate(query.startDate, 'dd MMM yyyy'); // from src/lib/utils.ts
```
- **Why**: Date-only fields (`startDate`, `endDate`, `journeyDate`) were shifting due to timezone conversion
- **Fix docs**: `docs/fixes/timezone-utc-fixes.md`

## 🧩 UI Components & Forms

### Shadcn Extensions (`src/components/ui/`)
- **Custom wrappers**: `form-date-picker.tsx`, `multi-select.tsx`, `destination-combobox.tsx`, `location-combobox.tsx`
- **Form patterns**: Use `react-hook-form` + Zod validation + `@/components/ui/form`
- **Combobox fixes**: Recent improvements to selection/display logic (see `docs/fixes/ui-component-fixes.md`)
- Before adding new libraries, check if shadcn + existing wrappers can solve the problem

### Form Component Pattern
```tsx
// Server component fetches data
const locations = await prismadb.location.findMany({ where: { isActive: true }});

// Pass to client component
<TourPackageForm initialData={tourPackage} locations={locations} />
```

## 📄 PDF Generation

### Puppeteer Setup (`src/utils/generatepdf.ts`)
- **Production**: Uses `@sparticuz/chromium-min` for Vercel serverless
- **Headers/footers**: Use `inlineImagesInHtml()` to convert remote images to data URIs (avoids loading issues in PDF margins)
- **Helper**: `createProfessionalFooter(companyInfo)` for consistent styling
- **Auth bypass**: Middleware allows HeadlessChrome user-agent through without Clerk auth

### Vercel Config (`vercel.json`)
```json
{
  "functions": { "src/app/api/**/*.ts": { "maxDuration": 30 } },
  "build": { "env": { "PRISMA_CLIENT_ENGINE_TYPE": "binary" } }
}
```

## 💬 WhatsApp Integration

### Core Library (`src/lib/whatsapp.ts`)
- **Meta Graph API** wrapper with `graphRequest<T>(endpoint, options)`
- **Template sending**: `sendWhatsAppTemplate()` - handles variable substitution, analytics recording
- **Session management**: WhatsApp Prisma client stores messages, sessions, automations
- **Business account resolution**: Auto-resolves WABA ID if not in env vars

### Required Environment Variables
Must be set on Vercel for builds (see `docs/VERCEL_ENV_SETUP.md`):
```
META_GRAPH_API_VERSION=v22.0
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_FLOW_PRIVATE_KEY=... (full RSA key with BEGIN/END)
WHATSAPP_FLOW_KEY_PASSPHRASE=...
```

### WhatsApp Docs Reference
- `docs/WHATSAPP_QUICK_START.md` - 15-min setup guide
- `docs/WHATSAPP_INTEGRATION_REDESIGN.md` - Architecture overview
- `docs/WHATSAPP_TEMPLATES_COMPLETE_GUIDE.md` - Template management

## 🧪 Scripts & Testing (`scripts/`)

### Directory Structure
- **`migrations/`** (6 scripts): Database migrations, data transformations
- **`tests/`** (20 scripts): API tests, timezone validation, feature tests
- **`whatsapp/`** (6 scripts): Template seeding, message sending, WhatsApp DB tests
- **`seed/`** (2 scripts): Seasonal periods, WhatsApp templates
- **`utilities/`** (10 scripts): Database checks, validation, structure verification

### Running Scripts
```bash
node scripts/tests/test-variants-api.js
node scripts/migrations/migrate-transportation-field.js
npm run sync-whatsapp-templates  # Package.json script
```
See `scripts/README.md` for full catalog.

## 🐛 Debugging

### DebugLogPanel (`src/components/DebugLogPanel.tsx`)
- Client component in root layout, intercepts `console.log/warn/error`
- Visible in dev mode (toggle in UI)
- **Best practice**: Use emoji-prefixed logs for categorization
```typescript
console.log('🔍 [API] Fetching tour packages:', { locationId, filters });
console.error('❌ [DB] Transaction failed:', error);
```

## 💰 Financial Transaction Patterns

### Shared Types (`types/index.ts`)
- `TransactionBase`, `FormattedTransaction` - standardized ledger display
- Form props interfaces: `PurchaseFormProps`, `SaleFormProps`, etc.

### Transaction Service (`src/lib/transaction-service.ts`)
- **`calculateRunningBalance(transactions, openingBalance)`**: Recompute balances for ledger views
- Used across bank accounts, cash accounts, customer/supplier ledgers

## 📚 Documentation Structure (`docs/`)

### Key References
- **Features**: `docs/features/` (package-variants, pdf-generation, seasonal-pricing)
- **Fixes**: `docs/fixes/` (timezone-utc-fixes, ui-component-fixes, validation-fixes)
- **Architecture**: `docs/architecture/` (multi-variant-design, database-schema)
- **Guides**: `docs/guides/` (quick-start, development)
- **Archive**: `docs/archive/` (80+ legacy docs preserved)

### When Adding Features
1. Update relevant docs in `docs/features/` or `docs/fixes/`
2. Link to docs in code comments instead of duplicating instructions
3. Follow existing markdown structure for consistency

## ⚙️ Development Workflow

### Essential Commands
```bash
npm run dev              # Start Next.js dev server
npm run build            # Build (runs Prisma generate x2 + Next build)
npm run lint             # ESLint check

npx prisma format        # Format schema
npx prisma generate      # Regenerate client after schema changes
npx prisma migrate dev   # Create new migration
```

### Pre-commit Checklist
- [ ] Run `npx prisma generate` if schema changed
- [ ] Test on both admin and associate domains if touching navigation/permissions
- [ ] Add/update tests in `scripts/tests/` if changing core logic
- [ ] Document breaking changes in relevant `docs/` files

## 🚀 Deployment (Vercel)

### Build Process
1. Runs `vercel-build` script: Prisma generate (both schemas) → Next.js build
2. Requires all `META_*` and `WHATSAPP_*` env vars to be set
3. Uses binary engine type for Prisma (`PRISMA_CLIENT_ENGINE_TYPE=binary`)
4. API routes have 30s max duration

### Vercel Env Setup
- Add all env vars to Production, Preview, Development environments
- Multi-line keys (like `WHATSAPP_FLOW_PRIVATE_KEY`) must include `-----BEGIN/END-----` markers
- See `docs/VERCEL_ENV_SETUP.md` for step-by-step

## 🎯 WhatsApp Campaigns System (Latest)

### Campaign Architecture (`src/app/api/whatsapp/campaigns/`)
- **Core Models**: `WhatsAppCampaign`, `WhatsAppCampaignRecipient`, `WhatsAppCampaignError` (11 related tables in `prisma/whatsapp-schema.prisma`)
- **Statuses**: `draft` → `scheduled` → `sending` → `completed` | `cancelled` | `failed`
- **Campaign Types**: `all` (broadcast), `segment` (query-based), `manual` (explicit recipients), `imported` (CSV)
- **API Routes**:
  - `GET /campaigns` - List with pagination, filtering by status
  - `POST /campaigns` - Create with recipients array
  - `GET /campaigns/[id]` - Details with recipient counts grouped by status
  - `POST /campaigns/[id]/send` - Start background sending (rate-limited)
  - `GET /campaigns/[id]/stats` - Analytics: delivery %, read %, failure breakdown
  - `POST /campaigns/[id]/recipients` - Add/remove recipients dynamically

### Campaign Sending Flow
```typescript
// 1. POST /send initiates background processing
// 2. Processes recipients in batches (respecting rateLimit)
// 3. Calls sendWhatsAppTemplate() from src/lib/whatsapp.ts
// 4. Stores delivery status in WhatsAppCampaignRecipient
// 5. Webhook updates stats when Meta delivers/reads
// Stats auto-refresh in UI every 5 seconds via polling
```

### Rate Limiting & Throttling
- **rateLimit** field: messages per minute (default 10)
- Each batch respects time windows to avoid Meta API throttling
- Failed messages tracked by error code (131049, 131050 for rate limits)
- Retry logic with exponential backoff for recoverable errors

### Testing Campaigns
- Script: `scripts/whatsapp/test-campaign-api.js` for CRUD operations
- Check `scripts/whatsapp/check-campaign-status.js` for stats debugging
- Use campaign `/stats` endpoint to verify delivery rates

## 🎯 Common Patterns Summary

| Task | Pattern |
|------|---------|
| **New API route** | Use `handleApi()` + `jsonError()`, add `export const dynamic = 'force-dynamic'` |
| **Date handling** | Use `dateToUtc()` for storage, `formatLocalDate()` for display |
| **Auth check** | `auth()` in API, `isCurrentUserAssociate()` for read-only checks |
| **Database query** | Import `@/lib/prismadb`, prefer `select` over `include` |
| **WhatsApp DB** | Use `whatsappPrisma` from `@/lib/whatsapp-prismadb` for campaign/catalog queries |
| **UI component** | Check `src/components/ui/` for existing wrappers before adding deps |
| **Logging** | Emoji-prefix console logs for DebugLogPanel categorization |
| **Multi-domain** | Test on admin + associate domains, check middleware restrictions |
| **Campaign ops** | Use `whatsappPrisma.whatsAppCampaign.findMany()` with `include: { _count: { select: { recipients } } }` |

## 📚 Key Utilities & Imports

### Dual Prisma Clients
```typescript
// Main database (tours, inquiries, finance)
import prismadb from '@/lib/prismadb';

// WhatsApp schema (campaigns, catalog, messages)
import whatsappPrisma from '@/lib/whatsapp-prismadb';
```

### WhatsApp Core Library (`src/lib/whatsapp.ts`)
```typescript
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
// Handles: template substitution, delivery tracking, error codes
```

### Campaign Utilities (`src/lib/whatsapp.ts`)
- `graphRequest<T>(endpoint, options)` - Meta Graph API wrapper
- `sendWhatsAppTemplate(phoneNumber, templateName, variables)` - Send with variable substitution
- Auto-resolves WABA ID from env if needed

## 📖 Further Reading
- **Main README**: `README.md` - Project overview, setup instructions
- **Scripts catalog**: `scripts/README.md` - All 44 scripts organized by category
- **Docs index**: `docs/README.md` - Complete documentation navigation
- **Campaign deep-dive**: `docs/CAMPAIGN_IMPLEMENTATION_SUMMARY.md` - Phase 1 architecture
- **Campaign quick ref**: `docs/CAMPAIGN_API_QUICK_REFERENCE.md` - API cheat sheet