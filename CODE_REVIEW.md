# Code Review Findings — Next.js 13 E-Commerce/Travel Admin

**Date:** 2026-02-15
**Reviewer:** Claude Code (Automated Review)

---

## Summary

This review covers security vulnerabilities, performance issues, best practices, and architectural improvements across the entire codebase. Findings are prioritized by severity.

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 4 | Exposed secrets, missing auth on sensitive routes, auth bypass, no rate limiting |
| HIGH | 6 | Missing authorization, IDOR, missing indexes, N+1 queries, outdated deps, env validation |
| MEDIUM | 10 | Large components, missing dynamic imports, type safety, accessibility, memory leaks |

---

## CRITICAL

### 1. Debug Endpoints Exposing Secrets

**Files:**
- `src/app/api/debug/env-check/route.ts` — Returns private key fragments and passphrase
- `src/app/api/public-debug/route.ts` — Unauthenticated config status
- `src/app/api/whatsapp/test-key/route.ts` — Key structure without auth
- `src/app/api/whatsapp/env-check/route.ts` — Config status without auth
- `src/app/api/whatsapp/config/route.ts` — Phone number ID without auth

**Action:** Delete all debug/diagnostic endpoints or gate behind admin-only auth.

### 2. Missing Authentication on Sensitive Routes

- `src/app/api/export/inquiries-contacts/route.ts` — CSV export of all contacts, no auth
- `src/app/api/customers/route.ts` (GET) — All customer records, no auth
- `src/app/api/customers/[customerId]/route.ts` (GET) — Individual customer, no auth
- `src/app/api/generate-pdf/route.ts` — PDF generation, no auth (DoS vector)
- `src/app/api/tourPackagesForWebsite/route.ts` — Featured packages, no auth

**Action:** Add `auth()` checks to all GET endpoints serving business data.

### 3. Auth Bypass via User-Agent Spoofing

`src/middleware.ts` bypasses auth for User-Agent strings containing `HeadlessChrome` or `Puppeteer`.

**Action:** Use API tokens or service keys for headless clients.

### 4. No Rate Limiting

Zero rate limiting on any API route. AI generation, PDF generation, and data exports are all unprotected.

**Action:** Add rate limiting middleware (e.g., `@upstash/ratelimit` or custom).

---

## HIGH

### 5. Authorization Not Enforced

`src/lib/authz.ts` defines roles (VIEWER, OPERATIONS, FINANCE, ADMIN, OWNER) and helpers like `requireFinanceOrAdmin()`, but almost no API routes use them. Any authenticated user can access financial data.

### 6. IDOR Vulnerabilities

Routes like `/api/customers/[customerId]` and `/api/tourPackageQuery/[tourPackageQueryId]` fetch records by ID with no ownership check.

### 7. Missing Database Indexes

Financial models missing date indexes: `PaymentDetail.paymentDate`, `ReceiptDetail.receiptDate`, `ExpenseDetail.expenseDate`, `IncomeDetail.incomeDate`.

### 8. N+1 Queries

`/api/tourPackageQuery/[tourPackageQueryId]/route.ts` fetches 4+ levels of nested relations. Use `select` or separate endpoints.

### 9. Outdated Dependencies

next 13.5.7, @clerk/nextjs 4.31.8, @prisma/client 5.22.0, react 18.2.0 — all multiple major versions behind.

### 10. Missing Env Validation

`process.env` read directly in 20+ files with no startup validation.

---

## MEDIUM

### 11. Large Components

`whatsapp/chat/page.tsx` (5,655 lines), `tourPackage-form_wysiwyg.tsx` (2,894 lines), `QueryVariantsTab.tsx` (2,319 lines).

### 12. Missing Dynamic Imports

Only 3 files use `dynamic()`. Heavy libraries (JoditEditor, Recharts, react-pdf) loaded eagerly.

### 13. Over-clientification

430 files use `"use client"`. Many could be server components.

### 14. Type Safety

2,715 instances of `any` type despite strict mode.

### 15. Duplicated Validation Schemas

913 inline Zod schema definitions with no shared schema library.

### 16. Missing onDelete Policies

Hotel and HotelPricing relations missing explicit onDelete actions.

### 17. Accessibility

114 ARIA attributes across 61 files. Missing form error aria, data table sort indicators, modal focus management.

### 18. No Client-Side Caching

No SWR or TanStack Query. Each component fetches independently.

### 19. Memory Leak

`src/hooks/use-associate-partner.tsx` uses module-level listeners array never cleaned up.

### 20. Inconsistent API Client

Mix of axios (260+ files) and fetch with no unified service layer.

---

## Recommended Architecture Changes

1. **API middleware** — Wrapper for auth, roles, rate limiting, validation
2. **Shared schemas** — `src/lib/schemas/` for reusable Zod schemas
3. **Env config** — `src/lib/env.ts` with Zod validation at startup
4. **Component decomposition** — Break files over 500 lines
5. **Data fetching** — Adopt TanStack Query or SWR
