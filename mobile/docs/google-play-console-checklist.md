# Google Play Console — Aagam Holidays (public app)

Complete these sections for **`com.aagamholidays.app`** before submitting to Production. Staff (`com.aagamholidays.staff`) and Finance (`com.aagamholidays.finance`) are internal apps — repeat only if you publish them separately.

**Privacy policy URL (required):** `https://aagamholidays.com/travel/privacy`  
**Account deletion URL:** `https://aagamholidays.com/travel/account-deletion`  
**Data deletion URL:** `https://aagamholidays.com/travel/data-deletion`

---

## Before you start (one-time setup)

### 1. Create a Play reviewer test account

Google reviewers **cannot** create accounts. Use **Google sign-in** (simplest for reviewers):

1. Create a dedicated Gmail account, e.g. `aagam.play.review@gmail.com`.
2. In [Clerk Dashboard](https://dashboard.clerk.com) → your production instance → ensure **Google** OAuth is enabled for the mobile application.
3. Sign in once on a real device with the Aagam Holidays release build so a travel user profile exists.
4. In your admin CRM, add this user to at least **one trip chat group** (so the **Trips** tab shows content after login).
5. Store the Gmail **email + password** in your password manager — you will paste them into Play Console.

> **Do not** use `MOBILE_DEV_AUTH_BYPASS` in production; it is disabled when `NODE_ENV=production`.

### 2. Deploy legal pages

Deploy the Next.js site so these URLs load without login:

- `/travel/privacy`
- `/travel/terms`

---

## Policy → App content

### App access (your current screen)

**Select:** `All or some functionality in my app is restricted`

**Instructions to copy** (edit email/password if different):

```
Aagam Holidays — reviewer access

PUBLIC WITHOUT LOGIN:
• Open the app → Home tab: browse tour packages and destinations.
• Tap a package → view itinerary, inclusions, and "Enquire Now".

RESTRICTED (SIGN-IN REQUIRED):
• Trips tab (group chat) and Profile (enquiries, saved packages) require sign-in.

SIGN-IN STEPS:
1. Open the app → Profile tab (bottom right) → "Sign In".
2. Tap "Continue with Google".
3. Use this Google account:
   Email: aagam.play.review@gmail.com
   Password: <YOUR_REVIEWER_PASSWORD>
4. If asked to complete profile (first time only): enter any display name and the same email.
5. After sign-in, open Trips tab — you should see at least one tour group chat with sample messages.
6. Profile → "My Enquiries" and "Saved Packages" are available when signed in.

No 2FA, membership paywall, or geo-block. No other device is required.

Support (not needed for review): info@aagamholidays.com
```

Add an **optional** second instruction set if you also support email OTP:

```
Alternative sign-in: Profile → Sign In → enter play-review@aagamholidays.com → enter the 6-digit code sent to that inbox (shared mailbox monitored for Play review).
```

Click **Save**.

---

### Ads

**Does your app contain ads?** → **No** (unless you added AdMob).

---

### Content ratings

1. Start questionnaire → category **Travel & Local** (or **Lifestyle** if Travel is unavailable).
2. Answer honestly:
   - Violence, sexual content, drugs, gambling → **No**
   - User-generated content (trip chat) → **Yes** → moderated by business / users can report via support email
   - Location shared → **Yes** (optional, user-initiated in chat)
   - Personal info shared → **Yes** (account + chat)
3. Apply rating → typically **Everyone** or **Teen** depending on UGC answers.

---

### Target audience and content

- **Target age:** 18+ (travel bookings) or 13+ if you prefer broader — align with Privacy Policy (not directed at under-13).
- **Appeal to children:** **No**
- **News app:** **No**

---

### Data safety

Declare what the app collects (aligned with Privacy Policy):

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | Account |
| Email | Yes | No | Account |
| Phone number | Optional | No | Account / enquiries |
| Photos / videos | Optional (user upload) | No | Trip chat |
| Location | Optional (user share) | No | Trip chat |
| Messages (chat) | Yes | No | Trip chat |
| Device IDs / push token | Yes | No | Notifications |
| Crash logs | Yes | No | App functionality |

- **Encrypted in transit:** Yes (HTTPS)
- **Users can request deletion:** Yes → link `https://aagamholidays.com/travel/account-deletion`
- **Data not sold**

---

### Government apps

**No**

---

### Financial features

**No** in-app payments or banking (public app). Bookings are handled offline/with staff.

---

### Health

**No**

---

### App integrity / Device permissions

Declare permissions matching `app.config.js`:

- **POST_NOTIFICATIONS** — trip updates
- **CAMERA / READ_MEDIA** — chat attachments (optional)
- **ACCESS_FINE_LOCATION** — share location in chat (optional)

---

## Grow → Store presence

### Main store listing

Upload assets from `mobile/marketing/` (generate SVGs: `node mobile/scripts/generate-store-assets.mjs`, then export PNGs — see `mobile/marketing/UPLOAD-INSTRUCTIONS.md`).

| Asset | Path |
|-------|------|
| App icon 512 | `mobile/assets/play-store-icon-512.png` |
| Feature graphic | `mobile/marketing/generated/feature-graphic.svg` → export 1024×500 PNG |
| Phone screenshots | 4× 1080×1920 PNG |

**Short description (80 chars):**

```
Browse curated tours, enquire instantly, and chat with your trip group on the go.
```

---

## Release → Testing → Production

1. Upload AAB: `eas submit` or internal testing track.
2. Complete **all** Policy → App content items (green checks).
3. **Publishing overview** → send for review.

---

## Staff app: Aagam Operations

For **`com.aagamholidays.staff`**:

- Upload the AAB to **Internal testing** first.
- Mark app access as **restricted**; provide Clerk email OTP or a Google account for an org user with **OPERATIONS** or **ADMIN/OWNER** access.
- Do **not** expose admin bypass tokens, keystore passwords, Clerk secret keys, or `google-service-account-key.json`.
- Verify on device before promotion:
  - Tour query edit and save
  - Variants tab
  - Pricing tab
  - Finance route
  - Location, transport, pickup/drop, and per-day transport details
- Promote to **Production** only after staff sign-off.

Sample release notes:

```text
Aagam Operations 1.0.3

- Redesigned tour-query workspace for edit, pricing, variants, and finance handoff.
- Added location, pickup/drop, transport, and per-day transport detail support.
- Requires the production mobile tour-query API deploy before rollout.
```

## Finance app: Aagam Accounts

If publishing **Aagam Accounts**:

- Mark **restricted**; provide **Clerk email OTP** or Google account for an org user with **FINANCE** / **ADMIN** / **OWNER** role.
- Do **not** expose admin bypass tokens in Play instructions.
- Use the separate Play Console app for `com.aagamholidays.finance`.

---

## Quick checklist

- [ ] Reviewer Google account created and added to a chat group
- [ ] App access → restricted + instructions saved
- [ ] Privacy policy URL set in Play Console
- [ ] Data safety form completed
- [ ] Content rating received
- [ ] Store listing graphics uploaded
- [ ] AAB uploaded to a testing track
- [ ] Production release submitted for review
