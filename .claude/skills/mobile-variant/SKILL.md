---
name: mobile-variant
description: Work on the three Expo app variants (public, staff, finance) — routing, icons, bearer auth, dev bypass, and USB/adb testing.
context: fork
agent: general-purpose
argument-hint: <variant> [task]
---

# Mobile App Variants (Expo)

One codebase in `mobile/`, three installed apps via `APP_VARIANT=public|staff|finance`.

## Input

- **$0** — Variant: `public` | `staff` | `finance` (optional)
- **$1** — Task: `screen`, `icons`, `test`, `api` (optional)

## Live Project State

Variant config:
```
!`head -60 mobile/lib/app-variant.ts 2>/dev/null`
```

Expo config:
```
!`head -80 mobile/app.config.js 2>/dev/null`
```

Staff CRM routes:
```
!`find mobile/apps/staff -name "*.tsx" 2>/dev/null | head -20`
```

## Architecture

| Variant | Router root | Metro | Package |
|---------|-------------|-------|---------|
| public | `mobile/apps/public` | 8081 | `com.aagamholidays.app` |
| staff | `mobile/apps/staff` | 8082 | `com.aagamholidays.staff` |
| finance | `mobile/apps/finance` | 8083 | `com.aagamholidays.finance` |

- Shared screens: `mobile/app/` — variant folders **re-export** route files
- `mobile/lib/app-variant.ts` — scheme, home route, nav filter (UX only)
- API: `mobile/lib/api.ts` — bearer token, retries; optional `X-Mobile-App-Variant` header (audit only)
- Backend RBAC is authoritative — never gate mutations on variant header alone

## Surface rules

- **public:** browse packages, chat, profile — no admin CRM
- **staff:** CRM inquiries, operations hub, WhatsApp (if role allows) — no finance write screens
- **finance:** `/admin/finance/*` hub — no chat, WhatsApp, public browse, or full CRM

## Adding a screen

1. Implement under `mobile/app/...` (shared)
2. Add thin re-export in `mobile/apps/<variant>/...` for each variant that needs it
3. Filter nav in `app-variant.ts` if needed
4. Add `testID` + accessibility props on all interactive elements
5. Call existing Next.js APIs (`/api/mobile/*` or domain routes like `/api/inquiries`)

## Icons

- Source emblem: `mobile/assets/logo-emblem-source.png`
- Generate all sizes: `cd mobile && npm run generate:icons` (`scripts/generate-app-icons.mjs`)
- Staff/finance badges: `badge-staff.svg`, `badge-finance.svg` (brand pink/plum, not blue/green)
- Config per variant in `mobile/app.config.js` (`icon`, `adaptiveIcon`, `notificationColor`)

## Dev auth bypass (local USB / scripts only)

Server `.env.local`:

```env
MOBILE_DEV_AUTH_BYPASS_ENABLED=1
MOBILE_DEV_AUTH_BYPASS_TOKEN=<secret>
MOBILE_DEV_AUTH_BYPASS_USER_ID=user_xxxx   # Clerk user with ADMIN/OWNER for staff CRM tests
```

- `src/proxy.ts` — bearer on `/api/inquiries*` skips session middleware
- `src/lib/clerk-request-user.ts` — resolves bypass token to user id

USB port forwarding (staff example):

```bash
adb reverse tcp:8082 tcp:8082
adb reverse tcp:3000 tcp:3000
```

## Testing

| Command | What |
|---------|------|
| `npm run test:mobile-inquiry-crud` (repo root) | API CRUD via `tools/test-mobile-inquiry-crud.mjs` |
| `cd mobile && npm run test:inquiry:adb` | UI CRUD via `scripts/adb-inquiry-crud-test.mjs` (needs adb + Metro) |
| `cd mobile && npm run test:staff` | Jest unit tests for staff variant |

Inquiry form reference: `mobile/components/inquiries/CreateInquiryForm.tsx` — testIDs `inquiry-create-*`, `inquiry-save-profile`, `inquiry-delete-*`.

## Docs

- `mobile/docs/app-variants.md`
- `mobile/README.md`
- `AGENTS.md` — Mobile App Variants section
