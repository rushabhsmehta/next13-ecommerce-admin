import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Aagam Holidays",
  description:
    "How Aagam Holidays collects, uses, and protects your personal data in our website and mobile app.",
};

const LAST_UPDATED = "25 May 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-lg text-white/90">Aagam Holidays — website and mobile app</p>
          <p className="text-sm text-white/70 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-gray-700 leading-relaxed">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Who we are</h2>
          <p>
            Aagam Holidays (&quot;we&quot;, &quot;us&quot;) operates the travel website at{" "}
            <a href="https://aagamholidays.com" className="text-orange-600 underline">
              aagamholidays.com
            </a>{" "}
            and the <strong>Aagam Holidays</strong> mobile app on Android and iOS. For privacy
            requests, contact{" "}
            <a href="mailto:info@aagamholidays.com" className="text-orange-600 underline">
              info@aagamholidays.com
            </a>
            .
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">2. What we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account data:</strong> name, email address, and phone number when you sign in
              (email OTP or Google/Apple sign-in via our authentication provider).
            </li>
            <li>
              <strong>Trip chat:</strong> messages, photos, documents, contacts, and location you
              choose to share in group chats for booked tours.
            </li>
            <li>
              <strong>Enquiries:</strong> travel preferences and contact details when you request a
              quote or package enquiry.
            </li>
            <li>
              <strong>Device data:</strong> push notification tokens, app version, and diagnostic
              logs used to fix crashes (no advertising profile is built from this data).
            </li>
            <li>
              <strong>Usage:</strong> basic in-app events (e.g. package views) to improve the
              product — not sold to third-party advertisers.
            </li>
          </ul>
          <p>
            Browsing tour packages and destinations on the Home screen does <strong>not</strong>{" "}
            require an account.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. How we use your data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide tour information, enquiries, and customer support.</li>
            <li>Operate trip group chat and send trip-related push notifications.</li>
            <li>Maintain booking and financial records where required by law.</li>
            <li>Improve app stability and security.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">4. Sharing with third parties</h2>
          <p>We use trusted processors only to run the service:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Authentication (Clerk)</li>
            <li>Cloud hosting and APIs (our infrastructure providers)</li>
            <li>Push delivery (Expo / Apple / Google notification services)</li>
            <li>Media storage (Cloudinary / Cloudflare R2) for images you upload in chat</li>
          </ul>
          <p>We do not sell your personal data.</p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. Permissions (mobile app)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Notifications</strong> — optional; for trip chat and enquiry updates.
            </li>
            <li>
              <strong>Camera &amp; photos</strong> — only when you attach media in trip chat.
            </li>
            <li>
              <strong>Location</strong> — only when you explicitly share your location in trip chat.
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Retention</h2>
          <p>
            Chat and profile data are kept while your account is active. Billing and completed-tour
            records may be retained for up to 7 years under Indian tax and GST requirements. See our{" "}
            <Link href="/travel/data-deletion" className="text-orange-600 underline">
              data deletion
            </Link>{" "}
            and{" "}
            <Link href="/travel/account-deletion" className="text-orange-600 underline">
              account deletion
            </Link>{" "}
            pages for how to request removal.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Your rights</h2>
          <p>
            You may access, correct, or delete your data by emailing{" "}
            <a href="mailto:info@aagamholidays.com" className="text-orange-600 underline">
              info@aagamholidays.com
            </a>
            . We respond within 30 days. If you are in India, you may also have rights under
            applicable data protection rules.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Children</h2>
          <p>
            The app is not directed at children under 13. We do not knowingly collect data from
            children.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Changes</h2>
          <p>
            We may update this policy. The &quot;Last updated&quot; date at the top will change.
            Continued use of the app after changes means you accept the updated policy.
          </p>
        </section>

        <p className="text-center text-sm text-gray-500 pb-8">
          <Link href="/travel/terms" className="text-orange-600 underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/travel/account-deletion" className="text-orange-600 underline">
            Account deletion
          </Link>
        </p>
      </div>
    </div>
  );
}
