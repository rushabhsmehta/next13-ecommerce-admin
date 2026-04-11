import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Data Deletion - Aagam Holidays",
  description:
    "Submit a request to delete specific personal data from your Aagam Holidays account without deleting your account.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Request Data Deletion
          </h1>
          <p className="text-lg text-white/90">
            Aagam Holidays — you can request deletion of specific data without
            closing your account.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* Data types you can request deleted */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Data you can request to be deleted
          </h2>
          <ul className="space-y-3 text-gray-700">
            {[
              "Chat messages you have sent in trip groups",
              "Location data shared in chat conversations",
              "Photos and files you uploaded in chats",
              "Contact details shared in chat (name, phone)",
              "Push notification token and preferences",
              "Profile information (name, phone number)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What is retained */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What cannot be deleted (legal obligation)
          </h2>
          <p className="text-gray-600 mb-4">
            The following data must be retained to comply with Indian financial and legal regulations:
          </p>
          <ul className="space-y-3 text-gray-700">
            {[
              "Billing and payment transaction records — retained for 7 years (GST / Income Tax Act requirement)",
              "Tour booking confirmation records linked to completed tours — retained for 7 years",
              "Anonymised, non-identifiable analytics data",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                  !
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How to request */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            How to request data deletion
          </h2>
          <ol className="space-y-6">
            {[
              {
                step: "1",
                title: "Send us an email",
                desc: 'Email info@aagamholidays.com with the subject line "Data Deletion Request".',
              },
              {
                step: "2",
                title: "Specify what you want deleted",
                desc: "Tell us which type(s) of data you want removed (e.g. chat messages, location data, profile info) and include the email address or phone number linked to your account.",
              },
              {
                step: "3",
                title: "We confirm your request",
                desc: "We will acknowledge your request within 7 business days.",
              },
              {
                step: "4",
                title: "Data is removed",
                desc: "The requested data will be permanently deleted within 30 days of confirmation. Your account remains active.",
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-5">
                <span className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                  {step}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-gray-600 mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <div className="text-center">
          <a
            href="mailto:info@aagamholidays.com?subject=Data%20Deletion%20Request"
            className="inline-block bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white font-semibold px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Email Us to Delete Data
          </a>
          <p className="mt-4 text-sm text-gray-500">
            Or write to us at{" "}
            <a
              href="mailto:info@aagamholidays.com"
              className="text-orange-600 underline"
            >
              info@aagamholidays.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
