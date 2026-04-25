import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  BookmarkCheck,
  CircleUserRound,
  Headphones,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Ticket,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account | Aagam Holidays",
  description: "Manage your travel profile, chat, and support shortcuts.",
};

const quickLinks = [
  {
    href: "/travel/chat",
    title: "Trip Chat",
    description: "Continue conversations with your travel team.",
    icon: MessageCircle,
  },
  {
    href: "/travel/packages",
    title: "Browse Packages",
    description: "Explore tour packages and discover your next trip.",
    icon: Ticket,
  },
  {
    href: "/travel/destinations",
    title: "Destinations",
    description: "Jump back into destination discovery.",
    icon: MapPinned,
  },
  {
    href: "/travel/data-deletion",
    title: "Data Requests",
    description: "Review your data deletion options and privacy help.",
    icon: ShieldCheck,
  },
  {
    href: "/travel/account-deletion",
    title: "Account Deletion",
    description: "Request account removal when you need it.",
    icon: CircleUserRound,
  },
  {
    href: "mailto:info@aagamholidays.com",
    title: "Contact Support",
    description: "Send a quick message to the Aagam Holidays team.",
    icon: Headphones,
  },
];

export default async function TravelAccountPage() {
  const user = await currentUser();
  const name = user?.fullName || user?.firstName || "Traveler";
  const email = user?.emailAddresses?.[0]?.emailAddress;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-white pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <section className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-600 via-red-600 to-purple-700 px-6 py-10 sm:px-10 sm:py-12 text-white shadow-xl shadow-orange-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_40%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
                Your Account
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Manage your travel profile in one place
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                Keep your travel details, chat access, and support shortcuts
                close at hand while you browse tour packages.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <BookmarkCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Signed in as
                  </p>
                  <p className="mt-1 text-lg font-semibold">{name}</p>
                  <p className="text-sm text-white/70">
                    {email || "Sign in to sync your profile"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!user ? (
          <section className="mt-8 rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900">
                Sign in to manage your trip details
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Once you sign in, this page can show your profile details and
                help you continue conversations with our travel team.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-px"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/travel/packages"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-200 hover:text-orange-600"
                >
                  Browse packages
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-orange-600">
                Quick Access
              </span>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Helpful shortcuts
              </h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              const isMail = item.href.startsWith("mailto:");

              const content = (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 text-orange-600 transition group-hover:from-orange-500 group-hover:to-red-500 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900 transition group-hover:text-orange-600">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
                  </div>
                </>
              );

              if (isMail) {
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
