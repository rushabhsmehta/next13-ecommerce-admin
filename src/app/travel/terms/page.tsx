import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Aagam Holidays",
  description: "Terms governing use of the Aagam Holidays website and mobile app.",
};

const LAST_UPDATED = "25 May 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-lg text-white/90">Aagam Holidays — website and mobile app</p>
          <p className="text-sm text-white/70 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-gray-700 leading-relaxed">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Agreement</h2>
          <p>
            By using the Aagam Holidays website or mobile app, you agree to these terms. If you do
            not agree, do not use the service.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">2. Service description</h2>
          <p>
            We provide travel information, package browsing, enquiry submission, and — after you
            book — trip group chat with our team. Prices and availability on the app are indicative;
            final quotes and bookings are confirmed by our staff.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. Accounts</h2>
          <p>
            You are responsible for keeping your sign-in method secure. You must provide accurate
            contact details. We may suspend accounts that abuse chat, spam enquiries, or violate
            law.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">4. Acceptable use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Do not harass other travellers or staff in trip chat.</li>
            <li>Do not upload illegal, offensive, or copyrighted content without permission.</li>
            <li>Do not attempt to access other users&apos; data or our systems without authorization.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. Bookings and payments</h2>
          <p>
            Bookings made through our team are subject to separate booking terms, cancellation
            policies, and invoices. In-app package prices may not include taxes or seasonal
            surcharges until confirmed in writing.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Disclaimer</h2>
          <p>
            The app is provided &quot;as is&quot;. We strive for accurate itineraries and timings but
            are not liable for delays caused by weather, transport operators, or events outside our
            reasonable control.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Privacy</h2>
          <p>
            Our{" "}
            <Link href="/travel/privacy" className="text-orange-600 underline">
              Privacy Policy
            </Link>{" "}
            explains how we handle personal data.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:info@aagamholidays.com" className="text-orange-600 underline">
              info@aagamholidays.com
            </a>
          </p>
        </section>

        <p className="text-center text-sm text-gray-500 pb-8">
          <Link href="/travel/privacy" className="text-orange-600 underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
