# Mobile App Variants

This Expo project builds three installed apps from the same `mobile/` codebase.

| Variant | App name | Android package / iOS bundle ID | Scheme | Expo Router root |
| --- | --- | --- | --- | --- |
| `public` | Aagam Holidays | `com.aagamholidays.app` | `aagamholidays` | `apps/public` |
| `staff` | Aagam Operations | `com.aagamholidays.staff` | `aagamstaff` | `apps/staff` |
| `finance` | Aagam Accounts | `com.aagamholidays.finance` | `aagamfinance` | `apps/finance` |

Use `APP_VARIANT=public|staff|finance` for any direct Expo command. The npm scripts already set it.

## Development

Each variant uses its **own Metro port** in dev so opening Accounts does not load Operations JS from a shared bundler:

| Variant | Metro port | Start command |
| --- | --- | --- |
| `public` | 8081 | `npm run start:public` |
| `staff` | 8082 | `npm run start:staff` |
| `finance` | 8083 | `npm run start:finance` |

USB reverse (example for Accounts):

```bash
adb reverse tcp:8083 tcp:8083
adb reverse tcp:3000 tcp:3000
```

If the installed app and Metro variant disagree, the app shows a **Wrong dev server** screen with fix steps.

```bash
npm run start:public
npm run start:staff
npm run start:finance
```

```bash
npm run android:public
npm run android:staff
npm run android:finance
```

```bash
npm run ios:public
npm run ios:staff
npm run ios:finance
```

## Builds

```bash
npm run build:android:public
npm run build:android:staff
npm run build:android:finance
```

```bash
npm run build:ios:public
npm run build:ios:staff
npm run build:ios:finance
```

Android uses `publicApp` as the internal Gradle flavor name because `public` is a Groovy keyword. The public app is still selected with `APP_VARIANT=public`.

## Tests

```bash
npm run test:public
npm run test:staff
npm run test:finance
```

```bash
npm run e2e:build
npm run e2e:build:staff
npm run e2e:build:finance
```

## Release Setup

Public keeps the existing EAS project ID. Staff and Finance need real EAS projects before production releases:

- Set `EXPO_STAFF_EAS_PROJECT_ID`.
- Set `EXPO_FINANCE_EAS_PROJECT_ID`.
- Replace the placeholder App Store Connect IDs in `eas.json`.
- Configure separate Android and iOS credentials for Staff and Finance.
- Add distinct Staff and Finance icon assets in `app.config.js` when final branding is ready (variants currently share the public placeholder icons).

Backend RBAC remains the source of truth. The mobile split only limits build identity, routes, navigation, permissions, push registration, and distribution.
