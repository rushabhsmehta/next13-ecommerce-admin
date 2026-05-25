# AGENTS.md

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

## Mobile App (Expo)

Located in `mobile/` directory:

- **Framework:** Expo SDK 55, React Native 0.83, Expo Router
- **Auth:** `@clerk/clerk-expo`
- **Testing:** Jest + Testing Library (unit), Detox (E2E Android)
- **State:** React hooks + Context
- **Storage:** `expo-secure-store` (auth), `expo-sqlite` (cache)

### Mobile App Variants

The mobile project builds three separately installed apps from one shared `mobile/` codebase. Use `APP_VARIANT=public|staff|finance`; the npm scripts below set it automatically.

| Variant | App name | Package / bundle ID | Scheme | Router root |
|---------|----------|---------------------|--------|-------------|
| `public` | Aagam Holidays | `com.aagamholidays.app` | `aagamholidays` | `mobile/apps/public` |
| `staff` | Aagam Operations | `com.aagamholidays.staff` | `aagamstaff` | `mobile/apps/staff` |
| `finance` | Aagam Accounts | `com.aagamholidays.finance` | `aagamfinance` | `mobile/apps/finance` |

Variant implementation notes:

- Expo config is dynamic in `mobile/app.config.js`; the old static `mobile/app.json` is intentionally removed.
- Shared app providers and push setup live in `mobile/components/app/`; variant helpers live in `mobile/lib/app-variant.ts`.
- Backend RBAC remains the source of truth. Client-side filtering only limits route surface, navigation, and UX exposure.
- Mobile API requests may include `X-Mobile-App-Variant` for audit/observability only; never authorize from that header.
- Public registers trip chat push only. Staff registers trip chat plus admin WhatsApp push when permitted. Finance registers no chat/WhatsApp push in v1.
- Android uses `publicApp` as the internal Gradle flavor name because `public` is a Groovy keyword; externally the variant is still `public`.
- Staff and Finance EAS project IDs are environment-driven (`EXPO_STAFF_EAS_PROJECT_ID`, `EXPO_FINANCE_EAS_PROJECT_ID`) and must be real before production releases.

### Mobile Commands

```bash
cd mobile
npm start                 # Start public Expo dev server
npm run start:public      # Start public app
npm run start:staff       # Start staff app
npm run start:finance     # Start finance app

npm run android:public    # Run public Android flavor
npm run android:staff     # Run staff Android flavor
npm run android:finance   # Run finance Android flavor

npm run ios:public        # Run public iOS app
npm run ios:staff         # Run staff iOS app
npm run ios:finance       # Run finance iOS app

npm test                  # Run public unit tests
npm run test:public       # Run public unit tests
npm run test:staff        # Run staff unit tests
npm run test:finance      # Run finance unit tests
npm run test:coverage     # Run public coverage

npm run e2e:build         # Build public Detox test APK
npm run e2e:test          # Run public Detox E2E tests on emulator
npm run e2e:build:staff   # Build staff Detox test APK
npm run e2e:test:staff    # Run staff Detox E2E tests
npm run e2e:build:finance # Build finance Detox test APK
npm run e2e:test:finance  # Run finance Detox E2E tests

npm run build:android:public
npm run build:android:staff
npm run build:android:finance
npm run build:ios:public
npm run build:ios:staff
npm run build:ios:finance
```

### Mobile Testing Strategy

| Test Type | Tool | Coverage Target | Location |
|-----------|------|-----------------|----------|
| Unit | Jest + Testing Library | API utilities, formatters | `mobile/__tests__/lib/` |
| Component | Jest + Testing Library | Shared UI components | `mobile/__tests__/components/` |
| E2E | Detox | Critical user paths | `mobile/e2e/` |

**Critical E2E Paths:**
1. Browse packages → filter → package detail → enquiry CTA
2. Login → chat → send message
3. Login → profile → sign out

4. Staff: login as admin/operations/associate, open allowed CRM/operations/associate/WhatsApp paths, confirm finance routes are absent
5. Finance: login as finance/admin/owner, open finance hub/accounts/receipt/payment/invoice/return/TDS flows, confirm public/chat/WhatsApp/CRM/operations routes are absent

### Mobile Key Patterns

- All interactive elements must have `testID` props for E2E
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` required for WCAG compliance
- API calls use `lib/api.ts` with built-in retry/timeout
- Offline cache via `lib/cache/index.ts` (expo-sqlite, 5-min TTL)
- Chat uses adaptive polling: 3s active, 10s inactive, 30s background
- OAuth redirects must use the active app scheme from `lib/app-variant.ts`; do not hardcode `aagamholidays`
- Aagam Accounts app must not expose chat, WhatsApp, CRM, operations, or public browse routes
- Aagam Operations app must not expose finance money-write screens or finance-only navigation
- Keep route wrappers under `mobile/apps/*` aligned with the intended app surface when adding mobile screens

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
      accounts/          # Financial accounts
      customers/         # Customer management
      hotels/            # Hotel management
      tourPackages/      # Tour package management
      tourPackageQuery/  # Tour inquiry management
      payments/          # Payment tracking
      expenses/          # Expense tracking
      reports/           # Analytics & reporting
    (root)/              # Public homepage
    api/                 # API routes (60+ endpoints)
    travel/              # Public-facing travel app
    ops/                 # Operations staff routes
  components/
    ui/                  # Shadcn UI components
    forms/               # Form components
    whatsapp/            # WhatsApp UI components
  lib/                   # Utilities (pricing, GST, phone, PDF, etc.)
  hooks/                 # React hooks
  providers/             # Context providers (theme, modal, toast)
  types/                 # TypeScript type definitions
  proxy.ts               # Clerk auth & host-based routing (Next.js 16)
schema.prisma            # Main MySQL schema (~1,700 lines)
prisma/
  whatsapp-schema.prisma # PostgreSQL WhatsApp schema
mobile/
  app.config.js           # Variant-aware Expo config
  apps/
    public/               # Public app route root
    staff/                # Staff app route root
    finance/              # Finance app route root
  app/                    # Shared source screens wrapped by variant route roots
  components/app/         # Shared mobile root providers, stacks, push controller
  lib/app-variant.ts      # Active variant, scheme, redirects, permission filtering
  docs/app-variants.md    # Variant command and release notes
```

## Database

Two Prisma schemas with separate clients:

- **`schema.prisma`** (MySQL) - Main business data: tour packages, hotels, itineraries, financial transactions, customers, inquiries. Client: `@prisma/client`
- **`prisma/whatsapp-schema.prisma`** (PostgreSQL) - WhatsApp messages, campaigns, catalogs, orders. Client: `@prisma/whatsapp-client`

Both clients are generated during `npm run build` and `postinstall`.

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Key Patterns

- **Domain-based access:** Main domain = full admin, `ops.*` = operations, `associate.*` = limited partner access (host checks in `src/proxy.ts`)
- **Roles:** OWNER, ADMIN, FINANCE, OPERATIONS, VIEWER (organization-based)
- **API routes** are in `src/app/api/` following Next.js App Router conventions
- **Server components** are the default; client components use `"use client"` directive

## Environment Variables

Required variables (see `.env` for full list):

- `DATABASE_URL` - MySQL connection string
- `WHATSAPP_DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Auth
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Image hosting
- `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` - Payments
- `OPENAI_API_KEY` - AI tour generation
- `META_WHATSAPP_PHONE_NUMBER_ID` / `META_WHATSAPP_ACCESS_TOKEN` - WhatsApp
- `EXPO_STAFF_EAS_PROJECT_ID` / `EXPO_FINANCE_EAS_PROJECT_ID` - Staff/Finance mobile EAS project IDs for OTA/native builds

## Linting & TypeScript

- ESLint extends `next/core-web-vitals`
- TypeScript strict mode enabled
- No Prettier config; formatting relies on ESLint
