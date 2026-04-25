"use client";

import { Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/travel/packages?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white pt-20 sm:pt-24 pb-6 sm:pb-8">
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-purple-500/10 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-orange-100 bg-white/95 backdrop-blur-xl shadow-lg shadow-orange-500/5 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-2xl border border-orange-100 bg-white">
                <Image
                  src="/aagamholidays.png"
                  alt="Aagam Holidays logo"
                  fill
                  className="object-contain p-1"
                  sizes="36px"
                />
              </div>
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  Search travel packages
                </p>
              </div>
            </div>
            <p className="max-w-lg text-xs sm:text-sm leading-5 text-gray-500">
              Search destinations, package names, or experiences directly from
              the top of the page.
            </p>
          </div>

          <form onSubmit={handleSearch}>
            <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:flex-row">
              <div className="flex flex-1 items-center rounded-xl bg-white px-4 py-2.5 shadow-sm">
                <Search className="mr-3 h-4 w-4 flex-shrink-0 text-orange-400 sm:h-5 sm:w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] sm:px-8 sm:py-3.5"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
