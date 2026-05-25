# Aagam Holidays - Mobile App

A React Native (Expo) mobile app for **iOS** and **Android** that connects to the Aagam Holidays backend.

- **Website**: `aagamholidays.com` (Next.js travel pages)
- **Admin CRM**: `admin.aagamholidays.com` (Next.js dashboard)
- **Mobile App**: This Expo project → Google Play Store + Apple App Store

## App Variants

This codebase builds three installed apps from one Expo project:

| Variant | App | Package / bundle ID | Scheme |
|---------|-----|---------------------|--------|
| `public` | Aagam Holidays | `com.aagamholidays.app` | `aagamholidays` |
| `staff` | Aagam Operations | `com.aagamholidays.staff` | `aagamstaff` |
| `finance` | Aagam Accounts | `com.aagamholidays.finance` | `aagamfinance` |

Use the variant scripts rather than raw Expo commands, for example `npm run start:staff`, `npm run android:finance`, or `npm run build:android:public`. See `docs/app-variants.md` for the full command list and release setup notes.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Expo SDK 55** | React Native framework with managed workflow |
| **Expo Router** | File-based navigation (like Next.js App Router) |
| **Expo Notifications** | Push notifications for iOS & Android |
| **Expo Image Picker** | Camera & photo library for chat |
| **Expo Location** | GPS location sharing in chat |
| **Expo Document Picker** | PDF/file sharing in chat |
| **Expo Secure Store** | Encrypted token storage |
| **EAS Build** | Cloud builds for app store submissions |

## App Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (Stack navigator)
│   ├── (tabs)/             # Bottom tab navigation
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── index.tsx       # Home - Hero, destinations, packages
│   │   ├── chat.tsx        # Trip chat group list
│   │   ├── whatsapp.tsx    # Admin WhatsApp inbox
│   │   └── profile.tsx     # User profile & settings
│   ├── packages/
│   │   └── [id].tsx        # Package detail with gallery, itinerary
│   ├── destinations/
│   │   └── [id].tsx        # Destination detail with packages
│   └── chat/
│       └── [groupId].tsx   # Chat room with messaging
├── components/             # Shared components
├── constants/
│   ├── api.ts              # API base URL configuration
│   └── theme.ts            # Colors, spacing, typography
├── lib/
│   ├── api.ts              # API client (connects to Next.js backend)
│   ├── cache/              # SQLite offline cache
│   ├── chat/               # Chat cache, outbox, upload, push helpers
│   └── whatsapp/           # WhatsApp cache, outbox, upload, push helpers
├── assets/                 # App icons, splash screens
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
└── package.json
```

## Screens

### 🏠 Home (Tab 1)
- Hero section with search
- Horizontally scrollable destination cards
- Featured package cards with pricing
- "Why Choose Us" feature highlights

### 🧭 Explore (Tab 2)
- Full package listing with pull-to-refresh
- Category filter chips (Domestic, International, etc.)
- Search by name or destination
- Package cards with images, duration, pricing

### 🗺 Destinations (Tab 3)
- Grid of destination cards with images
- Package count per destination
- Tap to see packages in that destination

### 💬 Trip Chat (Tab 4)
- List of tour group chats
- Group chat with real-time message polling (3s)
- Message types: Text, Image, Location, Contact, Tour Link, PDF/File
- Attachment bar with location sharing, contact sharing
- Sender names, timestamps, read receipts

### 👤 Profile (Tab 5)
- User info and avatar
- Push notification toggle
- About/contact information
- Sign out

### 📦 Package Detail
- Swipeable image gallery with pagination dots
- Package name, location, duration
- Tab navigation: Itinerary / Inclusions / Policies
- Collapsible day-by-day itinerary with activities
- Bottom sticky "Enquire Now" CTA bar

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Expo Go app on your phone (for development)

### Development

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

### Backend Configuration

Edit `constants/api.ts` to point to your backend:

```typescript
// Development
export const API_BASE_URL = "http://your-local-ip:3000";

// Production
export const API_BASE_URL = "https://admin.aagamholidays.com";
```

### Building for App Stores

```bash
# Login to Expo account
eas login

# Configure project
eas build:configure

# Build for Android (APK for testing)
eas build --platform android --profile preview

# Build for iOS (simulator)
eas build --platform ios --profile development

# Production builds
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Required Assets

Before building, add these image assets to the `assets/` directory:

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024×1024 | Aagam Holidays app icon |
| `icon-staff.png` / `icon-finance.png` | 1024×1024 | Same Aagam emblem + corner badge (ops / accounts) |
| `badge-staff.svg` / `badge-finance.svg` | vector | Corner badges for staff/finance icons |
| `adaptive-icon.png` (+ staff/finance) | 1024×1024 | Android adaptive icon foreground |
| `splash.png` | 1284×2778 | Splash screen |
| `favicon.png` | 48×48 | Web favicon |
| `notification-icon.png` | 96×96 | Android notification icon |

## API Integration

The mobile app connects to the same Next.js backend APIs:

| API | Auth | Description |
|-----|------|-------------|
| `GET /api/travel/packages` | Public | List tour packages |
| `GET /api/travel/destinations` | Public | List destinations |
| `GET /api/travel/search` | Public | Search packages/destinations |
| `GET /api/chat/groups` | Auth | User's chat groups |
| `GET /api/chat/groups/:id/messages` | Auth | Messages in a group |
| `POST /api/chat/groups/:id/messages` | Auth | Send a message |
| `GET /api/chat/me` | Auth | Current user profile |
| `POST /api/push/subscribe` | Auth | Register push token |

## Local testing without Clerk (dev bypass)

Debug builds can skip Clerk OTP/OAuth and use a static bearer token. The server still resolves a **real** Clerk `user_…` id (org role and permissions come from that user in your database).

### 1. Server (repo root `.env.local`)

```env
MOBILE_DEV_AUTH_BYPASS_ENABLED=1
MOBILE_DEV_AUTH_BYPASS_TOKEN=mobile-dev-test-bypass-20260522
MOBILE_DEV_AUTH_BYPASS_USER_ID=user_xxxxxxxx
```

- `MOBILE_DEV_AUTH_BYPASS_USER_ID` — copy from [Clerk Dashboard](https://dashboard.clerk.com) → Users → your test account. Use an **OWNER** or **ADMIN** user to exercise Staff + Finance; use a travel customer’s id for public-app-only flows.
- Never enable this in production (`NODE_ENV=production` ignores bypass).

Restart `npm run dev` after changing env.

### 2. Physical device + USB

Metro and the Next.js API must reach your PC:

Each app variant has its **own Metro port** (so Accounts does not load Operations JS):

| App | Metro port | Start |
| --- | --- | --- |
| Holidays | 8081 | `npm run start:public` |
| Operations | 8082 | `npm run start:staff` |
| Accounts | 8083 | `npm run start:finance` |

```bash
# Example: Accounts on USB
adb reverse tcp:8083 tcp:8083
adb reverse tcp:3000 tcp:3000
```

Start the API (`npm run dev` in repo root) and the matching Metro command in `mobile/`.

### 3. On the phone

1. Open **Profile** (or Admin gate) → **Sign in**.
2. Tap **Developer sign-in (bypass Clerk)**.
3. Paste the same token as `MOBILE_DEV_AUTH_BYPASS_TOKEN` (e.g. `mobile-dev-test-bypass-20260522`).
4. Tap **Continue with bypass token**.
5. If prompted, complete the one-time profile form (name + email for travel users).

Detox and `mobile/scripts/adb-*.mjs` use the same token by default.

## Chat Features

- ✅ Text messages
- ✅ Location sharing (GPS)
- ✅ Contact sharing
- ✅ Tour package link sharing
- ✅ Image display
- ✅ PDF/File download links
- ✅ Real-time polling (3 second intervals)
- ✅ Message sender names & timestamps
- ✅ Admin-controlled user access

## Push Notifications

Push notifications are handled by Expo Notifications:

1. User enables notifications in Profile → toggle switch
2. App requests OS permission
3. Expo push token is registered with the backend
4. Backend can send push notifications for new chat messages, tour updates, etc.
5. Notification channels: "default" and "chat" (Android)
