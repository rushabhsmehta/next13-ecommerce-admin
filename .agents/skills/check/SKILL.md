---
name: check
description: Run lint, type-check, and build to verify the project compiles without errors.
disable-model-invocation: true
allowed-tools: Bash(npm run lint*), Bash(npx tsc*), Bash(npm run build*)
---

# Run Project Checks

Run lint and build checks to verify the project compiles without errors.

## Current Git Status

```
!`git status --short | head -20`
```

## Steps

1. **Run ESLint**: `npm run lint`
   - Fix any linting errors found
   - Report warnings but don't fail on them
2. **Run TypeScript type-check**: `npx tsc --noEmit`
   - This checks types without generating output files
   - Fix any type errors found
3. **Run build** (if requested or if lint/types pass): `npm run build`
   - This also generates both Prisma clients
   - Report any build errors

## Notes

- The build command runs `prisma generate` for both schemas before `next build`
- If Prisma schema has changed, the build will regenerate clients automatically
- Report a clear summary at the end: what passed, what failed, what was fixed
