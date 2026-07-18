# AGENTS.md

Short agent entrypoint for this repo. For deep inventories (full dashboard module list, API tables, financial model detail), see [CLAUDE.md](CLAUDE.md) and the skills under `.agents/skills/`.

## Project Overview

Travel & tourism admin platform: CMS, admin dashboard, and API layer for tour packages, inquiries, hotel bookings, and financial transactions. Built on **Next.js 16** App Router with **Clerk** org RBAC, a custom **MCP** server (139 tools), and three **Expo** mobile apps from one `mobile/` codebase.

## Tech Stack

| Layer | Stack |
|-------|--------|
| Web | Next.js 16.1.6, React 19.2.4, TypeScript 5.9.3 |
| Database | MySQL (`schema.prisma`) + PostgreSQL WhatsApp (`prisma/whatsapp-schema.prisma`); Prisma 5.22 |
| Auth | Clerk (`@clerk/nextjs`) — org roles in `OrganizationMember` |
| UI | Shadcn/Radix, Tailwind 3.4 |
| Mobile | Expo SDK ~55, React Native 0.83.6, Expo Router, `@clerk/clerk-expo` |
| Forms | React Hook Form + Zod |
| PDF / Excel | Puppeteer, jsPDF, xlsx |
| AI / MCP | OpenAI, Gemini; `mcp-server/` + `src/app/api/mcp/` |

## Commands

```bash
# Web (repo root)
npm run dev                              # Next.js dev server (:3000)
npm run build                            # next build (Prisma clients via postinstall)
npm run postinstall                      # prisma generate (main + whatsapp schemas)
npm run lint
npm run test:accounts                    # Accounting module tests
npm run test:hotel-pricing-matrix        # Hotel pricing matrix tests
npm run test:hotel-effective-pricing     # Effective hotel pricing tests
npm run test:crm-route-access            # CRM route access rules tests
npm run test:mobile-inquiry-crud         # Inquiry API CRUD smoke test (dev bypass)

# Mobile (cd mobile — run npm install first)
npm run start:public                     # Metro :8081
npm run start:staff                      # Metro :8082 — Aagam Operations
npm run start:finance                    # Metro :8083 — Aagam Accounts
npm run android:public / android:staff / android:finance
npm run ios:public / ios:staff / ios:finance
npm run test:public / test:staff / test:finance
npm run generate:icons                   # Regenerate launcher icons (all variants)
npm run test:inquiry:adb                 # USB inquiry create/edit/delete (needs adb)
```

## Mobile App Variants

Three installed apps; set `APP_VARIANT=public|staff|finance` (npm scripts set it). Config: `mobile/app.config.js`.

| Variant | App name | Package | Scheme | Router root | Metro port |
|---------|----------|---------|--------|-------------|------------|
| `public` | Aagam Holidays | `com.aagamholidays.app` | `aagamholidays` | `mobile/apps/public` | 8081 |
| `staff` | Aagam Operations | `com.aagamholidays.staff` | `aagamstaff` | `mobile/apps/staff` | 8082 |
| `finance` | Aagam Accounts | `com.aagamholidays.finance` | `aagamfinance` | `mobile/apps/finance` | 8083 |

**Variant rules**

- Shared screens live under `mobile/app/`; variant route roots re-export in `mobile/apps/{public,staff,finance}/`.
- `mobile/lib/app-variant.ts` — scheme, home route, nav filtering (UX only; **backend RBAC is source of truth**).
- `X-Mobile-App-Variant` header is audit-only — never authorize from it.
- **Staff:** CRM (`/admin/crm/inquiries`), operations hub, WhatsApp when permitted — no finance write screens.
- **Finance:** `/admin/finance/*` only — no chat, WhatsApp, public browse, or full CRM.
- **Public:** packages, chat, profile — no admin CRM.
- Android Gradle flavor for public is `publicApp` (Groovy keyword).
- Icons: shared `logo-emblem-source.png` on cream; staff/finance add corner badges (`#c23a5e`, `#9b3a8d`). Regenerate: `npm run generate:icons` in `mobile/`.

**Bearer mobile API surfaces (examples):** `/api/mobile/inquiries`, `/api/mobile/crm`, `/api/mobile/coupons` (plus admin/ops/finance/whatsapp segments under `/api/mobile/`).

**Mobile dev bypass (physical device / Detox / adb scripts)**

Server `.env.local`:

```env
MOBILE_DEV_AUTH_BYPASS_ENABLED=1
MOBILE_DEV_AUTH_BYPASS_TOKEN=<secret>
MOBILE_DEV_AUTH_BYPASS_USER_ID=user_xxxxxxxx   # real Clerk id with ADMIN/OWNER for staff CRM or FINANCE/ADMIN/OWNER for finance
```

USB: `adb reverse tcp:<active-metro-port> tcp:<active-metro-port>` and `adb reverse tcp:3000 tcp:3000` (8081 public, 8082 staff, 8083 finance). See `mobile/README.md` and `mobile/docs/app-variants.md`.

## Project Structure

```
src/
  app/
    (auth)/                 # Clerk sign-in / sign-up
    (dashboard)/            # Admin modules (50+); also coupons, follow-ups, website-management
    (root)/                 # Public homepage
    access-denied/          # RBAC access-denied page
    api/                    # REST + mobile/* + mcp/ + coupons, follow-ups, website-inquiry, cron
    travel/                 # Public travel site
    ops/                    # Ops staff (ops.* host)
    mcp/                    # MCP OAuth authorize
  components/
  lib/                      # Prefer this over root lib/ stubs — authz, prismadb, api-response, …
  proxy.ts                  # Clerk + host routing; bearer /api/inquiries
mobile/
  app.config.js
  apps/{public,staff,finance}/
  app/                      # Shared screens
  components/inquiries/     # CreateInquiryForm
  scripts/                  # adb-*, generate-app-icons.mjs
mcp-server/                 # MCP tool registration (139 tools)
schema.prisma               # Main MySQL schema
prisma/whatsapp-schema.prisma
prisma/migrations/          # Prisma migrations
migrations/                 # Ad-hoc SQL migrations (not Prisma)
scripts/                    # WhatsApp, DB maintenance utilities
tools/                      # test-mobile-inquiry-crud.mjs, data fixes, migrations
cron/whatsapp-campaign-worker/  # Standalone campaign worker deploy
docs/
flow-keys/                  # WhatsApp Flow RSA keys
instrumentation.ts
.agents/skills/             # Cursor agent skills (mirrored in .claude/skills/)
```

## Database

- **Main:** `@prisma/client` — tours, inquiries, finance, customers, org members.
- **WhatsApp:** `@prisma/whatsapp-client` — messages, campaigns, catalogs.

Never run destructive Prisma commands against production. Schema changes → `prisma migrate dev` only with user confirmation.

## Key Patterns

### Web dashboard

- **Server → client:** `page.tsx` fetches with Prisma; `components/*-client.tsx` for tables/forms.
- **New API routes:** Prefer `handleApi()` from `@/lib/api-response.ts`; `export const dynamic = "force-dynamic"` for mutable data.
- **Legacy routes:** `auth()` + try/catch + `console.log("[PREFIX]", error)`.
- **Dates:** `dateToUtc()` / `formatSafeDate()` from `@/lib/timezone-utils.ts`.
- **Currency:** INR via `formatPrice()` from `@/lib/utils`.
- **Newer surfaces (paths only):** dashboard/API for coupons, follow-ups, website-management / website-inquiry.

### Auth & routing (`src/proxy.ts`)

- Hosts: main = full admin, `associate.*` = partner, `ops.*` = operations portal.
- `/api/mobile/*` and `/api/chat/*` skip Clerk session middleware.
- **`/api/inquiries*` with valid mobile Bearer** (Clerk JWT or dev bypass) skips session redirect — native apps have no cookies.
- Org roles: `OWNER` > `ADMIN` > `FINANCE` > `OPERATIONS` > `VIEWER` (`src/lib/authz.ts`).
- **CRM route gating:** `src/lib/crm-route-access-rules.ts` (client-safe path→roles; sidebar) and `src/lib/crm-route-access.ts` (server/API; includes Puppeteer/HeadlessChrome org-RBAC bypass for PDF automation).

### Inquiries (CRM + mobile staff)

- List/create/edit/delete: `src/app/api/inquiries/` (used by `mobile/lib/associate-inquiries.ts` and dashboard).
- Access: `src/lib/inquiry-access.ts` — org members resolved from DB first; associates via partner email.
- Mobile UI: `mobile/app/admin/crm/inquiries/`, `CreateInquiryForm` with `testID`s (`inquiry-create-*`, `inquiry-save-profile`, `inquiry-delete-*`).
- Mobile picker list: `GET /api/mobile/inquiries` (bearer-only; avoids middleware redirect).

### Financial

- Balances on `BankAccount` / `CashAccount` updated in payment/receipt/transfer routes.
- Allocations: `ReceiptSaleAllocation`, `PaymentPurchaseAllocation`.
- See skill `financial-context` before finance changes.

### MCP

- Gateway: `src/app/api/mcp/route.ts`; 17 handler modules + `index.ts` dispatcher under `src/app/api/mcp/handlers/`.
- Tools: `mcp-server/src/tools/*.ts` — **139** registered tools.
- Auth: `x-mcp-api-secret` header.

### Cron / campaigns

- Standalone worker: `cron/whatsapp-campaign-worker/` (deploy path for campaign processing).
- App cron/report routes use `CRON_SECRET` (see Environment Variables).

## Agent Skills

Skills live in `.agents/skills/` (mirrored in `.claude/skills/`). Invoke by name when relevant. After editing skills, sync with:

```bash
node scripts/sync-agent-skills.mjs
# or on Windows: robocopy .agents/skills .claude/skills /MIR
```

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

## Environment Variables

See `.env` / `.env.local`. Notable:

- `DATABASE_URL`, `WHATSAPP_DATABASE_URL`
- `CLERK_*`, `MCP_API_SECRET`, `CRON_SECRET`
- `MOBILE_DEV_AUTH_BYPASS_*` — dev only, never production
- `EXPO_STAFF_EAS_PROJECT_ID`, `EXPO_FINANCE_EAS_PROJECT_ID` — separate EAS projects for staff/finance builds
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` — optional; inquiry **Email Supplier** (send as `aagamholiday@gmail.com`). Also set on Railway for production. Refresh token from OAuth (`~/.gmail-mcp/credentials.json`).

## Linting & Git

- ESLint: `next/core-web-vitals`; TypeScript strict.
- Develop on feature branches; do not commit directly to `main`.
- Commit only when the user asks.

## Critical Safety

- No `prisma migrate reset`, `db push --force-reset`, or DROP against prod.
- Confirm schema migrations with the user before `prisma migrate dev`.
