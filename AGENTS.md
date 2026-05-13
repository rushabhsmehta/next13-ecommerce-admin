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

### Mobile Commands

```bash
cd mobile
npm start            # Start Expo dev server
npm test             # Run unit tests
npm run test:coverage # Run unit tests with coverage
npm run e2e:build    # Build Detox test APK (debug)
npm run e2e:test     # Run Detox E2E tests on emulator
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

### Mobile Key Patterns

- All interactive elements must have `testID` props for E2E
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` required for WCAG compliance
- API calls use `lib/api.ts` with built-in retry/timeout
- Offline cache via `lib/cache/index.ts` (expo-sqlite, 5-min TTL)
- Chat uses adaptive polling: 3s active, 10s inactive, 30s background

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

## Linting & TypeScript

- ESLint extends `next/core-web-vitals`
- TypeScript strict mode enabled
- No Prettier config; formatting relies on ESLint
