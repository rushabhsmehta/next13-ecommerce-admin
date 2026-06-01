# Aagam Operations Android Release

Production release runbook for the Expo staff variant.

## Target

| Field | Value |
| --- | --- |
| App name | Aagam Operations |
| Variant | `staff` |
| Android package | `com.aagamholidays.staff` |
| Gradle flavor/task | `staff` / `bundleStaffRelease` |
| EAS profile | `production-staff` |
| OTA channel | `staff-production` |
| Runtime version | `1.0.3-staff` |
| Version | `1.0.3` |
| Version code | `44` |
| API base | `https://admin.aagamholidays.com` |
| EAS project ID | `69483194-f389-44dd-91bf-38be100d9267` |

## Pre-release Checks

Run from the repo root unless noted.

```powershell
git status --short
cd mobile
npm run test:staff
```

Confirm the staff payload is present:

- `mobile/app/admin/tour-queries/[id]/`
- `mobile/components/tour-queries/`
- `mobile/lib/tour-query-edit.ts`
- `mobile/lib/tour-query-pricing.ts`
- `mobile/lib/api.ts`
- `mobile/lib/cache/index.ts`
- `mobile/apps/staff/admin/tour-queries/[id]/finance.tsx`
- `mobile/__tests__/lib/tour-query-*.test.ts`
- `mobile/__tests__/lib/variant-build-utils.test.ts`

Confirm the required backend API files are included in the production deploy:

- `src/app/api/mobile/tour-queries/[id]/route.ts`
- `src/app/api/mobile/tour-queries/[id]/variants/route.ts`

The current Play upload must use a `versionCode` greater than `43`. This release uses `44`. If Play already has `44` or higher, bump `versionCode` and artifact names before building.

## Clerk Key

`production-staff` must use the production Clerk publishable key. Do not commit the value.

Set this before EAS builds. Because this is an `EXPO_PUBLIC_*` client-side value, use EAS environment visibility `sensitive` rather than `secret`.

```powershell
cd mobile
npx eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "<production Clerk publishable key>" --visibility sensitive
```

For local Gradle builds, export it in the shell:

```powershell
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "<production Clerk publishable key>"
```

## Railway Backend Deploy

Deploy the Railway backend before users install the AAB. GitHub push alone does not update phones, and it only updates the production API if Railway auto-deploy is enabled for this branch.

Minimum production API deploy:

- `src/app/api/mobile/tour-queries/[id]/route.ts`
- `src/app/api/mobile/tour-queries/[id]/variants/route.ts`

The current working tree also includes travel/public app and proxy changes under `src/app/travel/*`, `src/app/api/travel/*`, `src/proxy.ts`, and public mobile tabs. If those are included in the same branch, they deploy with the backend push.

If Railway auto-deploy is enabled, push the branch and confirm the new production deployment in Railway. For a manual Railway CLI deploy, use `railway up` from the repo root:

```powershell
cd D:\GitHub\next13-ecommerce-admin
railway login
railway up --environment production
```

## Path A: EAS Build

Preferred for Google Play.

```powershell
cd D:\GitHub\next13-ecommerce-admin\mobile
npx eas login
npm run build:android:staff
npm run submit:android:staff
```

`npm run submit:android:staff` requires `mobile/google-service-account-key.json`. Never commit that file.

## Path B: Local AAB

Requires `mobile/android/keystore.properties`; copy `mobile/android/keystore.properties.example` and fill it if missing.

```powershell
cd D:\GitHub\next13-ecommerce-admin\mobile
$env:APP_VARIANT = "staff"
$env:EXPO_PUBLIC_API_BASE_URL = "https://admin.aagamholidays.com"
$env:EXPO_PUBLIC_WEBSITE_URL = "https://aagamholidays.com"
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "<production Clerk publishable key>"
$env:EXPO_STAFF_EAS_PROJECT_ID = "69483194-f389-44dd-91bf-38be100d9267"
cd android
.\gradlew.bat bundleStaffRelease
```

Output:

```text
mobile/android/app/build/outputs/bundle/staffRelease/app-staff-release.aab
```

The helper script copies the staff artifact as:

```text
mobile/artifacts/play-store/aagam-operations-staff-1.0.3-v44.aab
```

## Play Console Checklist

For `com.aagamholidays.staff`:

- Upload the AAB to Internal testing first.
- Use release notes:

```text
Aagam Operations 1.0.3

- Redesigned tour-query workspace for edit, pricing, variants, and finance handoff.
- Added location, pickup/drop, transport, and per-day transport detail support.
- Requires the production mobile tour-query API deploy before rollout.
```

- Verify on device: tour query edit/save, variants, pricing, finance route, location, transport, pickup/drop, and per-day transport fields.
- Promote to Production after staff sign-off.

## Post-release OTA

For future JS-only fixes on the same native runtime and channel:

```powershell
cd D:\GitHub\next13-ecommerce-admin\mobile
npm run update:staff:production
```
