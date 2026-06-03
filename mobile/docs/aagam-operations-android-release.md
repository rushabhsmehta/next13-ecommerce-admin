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
| Runtime version | `1.0.4-staff` |
| Version | `1.0.4` |
| Version code | `47` |
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

The current Play upload must use a `versionCode` greater than the latest Play/EAS build. This release uses `47`. If Play already has `47` or higher, bump `versionCode` and artifact names before building.

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

## Clerk Native Google Sign-In

Google sign-in uses Clerk's native Google flow (`@clerk/expo/google`). It requires Google Cloud OAuth clients, EAS production env values, and Clerk native-app configuration.

Set these on the **staff EAS project** for production:

```powershell
cd mobile
node ./scripts/run-with-variant.mjs staff eas env:create production --name EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID --value "<Google web OAuth client id>" --visibility plaintext --non-interactive --force
node ./scripts/run-with-variant.mjs staff eas env:create production --name EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID --value "<Google Android OAuth client id>" --visibility plaintext --non-interactive --force
```

Google Cloud must contain:

- **Web OAuth client** with Clerk's Authorized Redirect URI.
- **Android OAuth client** for package `com.aagamholidays.staff` and the app signing **SHA-1** fingerprint.

Clerk Dashboard must also be configured. Print a local checklist:

```powershell
cd mobile
node scripts/print-clerk-staff-android-setup.mjs
```

In the **production** Clerk instance ([dashboard.clerk.com](https://dashboard.clerk.com) → switch instance → **Configure → Native applications**):

1. **Native API** — enabled.
2. **Add Android app** — package `com.aagamholidays.staff`.
3. **SHA-256 fingerprints** (add both if you test debug APK and ship on Play):
   - **Play production:** Google Play Console → **Setup → App signing** → **App signing key certificate** → SHA-256 (not only the upload key).
   - **Local debug APK:** `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` (repo `android/app/debug.keystore`).
4. **Allowlist for mobile SSO redirect** — keep these for legacy/browser fallback safety:

```text
aagamstaff://oauth-native-callback
aagamstaff://sso-callback
clerk://com.aagamholidays.staff.callback
```

5. **Social connections → Google** — enabled on the same Clerk instance.

`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for `production-staff` on EAS must be the **production** `pk_live_…` key for that instance (not `pk_test_…` from `mobile/.env.production`).

If `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID` is missing from the EAS production build environment, the app shows *"Google sign-in is missing its production client ID..."*.

If Native API is disabled, the Android app entry is missing, SHA-256 does not match the installed APK, or redirect URLs are missing, legacy/browser fallback errors can show *"Mobile SSO is not configured in Clerk..."*.

## Crash on login: `Cannot find native module 'ExpoCryptoAES'`

`@clerk/expo` v3+ requires the **native** `expo-crypto` module. If Play ships a binary built without it but **Expo OTA** (`staff-production`) delivers newer JS (Clerk 3 / login), opening **Sign in** crashes with *"Aagam Operations keeps stopping"* before Google OAuth runs.

**Fix:** new native `production-staff` EAS build + Play upload (`expo-crypto` in `package.json` — autolinked, not a config plugin). Reinstall from closed testing. Avoid OTA-only Clerk upgrades until `runtimeVersion` and native modules match.

USB check: `adb logcat -b crash | findstr ExpoCryptoAES`

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
mobile/artifacts/play-store/aagam-operations-staff-1.0.4-v47.aab
```

## Play Console Checklist

For `com.aagamholidays.staff`:

- Upload the AAB to Internal testing first.
- Use release notes:

```text
Aagam Operations 1.0.4

- Fixes Google sign-in in the Operations app with Clerk native Google authentication.
- Adds production Google client IDs to the staff app config.
- Requires the new AAB; this is not a JS-only OTA update.
```

- Verify on device: tour query edit/save, variants, pricing, finance route, location, transport, pickup/drop, and per-day transport fields.
- Promote to Production after staff sign-off.

## Post-release OTA

For future JS-only fixes on the same native runtime and channel:

```powershell
cd D:\GitHub\next13-ecommerce-admin\mobile
npm run update:staff:production
```
