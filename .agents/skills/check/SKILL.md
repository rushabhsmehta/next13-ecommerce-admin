---
name: check
description: Run lint, type-check, and build to verify the project compiles without errors.
disable-model-invocation: true
allowed-tools: Bash(npm run lint*), Bash(npx tsc*), Bash(npm run build*), Bash(npm run test*)
---

# Run Project Checks

Run lint and build checks to verify the project compiles without errors.

## Current Git Status

```
!`git status --short | head -20`
```

## Steps

1. **Run ESLint** (repo root): `npm run lint`
   - Fix linting errors; report warnings without failing the task
2. **Run TypeScript**: `npx tsc --noEmit`
   - Root `tsconfig.json` excludes `mobile/`, `scripts/`, `prisma/`
3. **Run build** (when requested or after lint/tsc pass): `npm run build`
   - Regenerates both Prisma clients, then `next build --webpack`
4. **Targeted tests** (when relevant):
   - `npm run test:accounts` — accounting module
   - `npm run test:mobile-inquiry-crud` — inquiry API CRUD (needs dev server + `MOBILE_DEV_AUTH_BYPASS_*` in `.env.local`)
5. **Mobile** (if mobile files changed and `mobile/node_modules` exists):
   - `cd mobile && npm run test:staff` (or `:public` / `:finance` by variant)
   - `cd mobile && npm run lint` if configured

## Notes

- Build runs `prisma generate` for MySQL + WhatsApp schemas before Next.js compile
- MCP changes: also `cd mcp-server && npm run build`
- Report a clear summary: what passed, what failed, what was fixed
- Do not run destructive Prisma commands as part of "check"
