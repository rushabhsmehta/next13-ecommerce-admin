"use client";

import { Search, MapPin, Calendar, Users, Plane } from "lucide-react";
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
    <section className="relative min-h-[90vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background - logo-inspired gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-700 to-purple-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,146,60,0.3)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(147,51,234,0.2)_0%,_transparent_50%)]" />

      {/* Decorative floating elements */}
      <div className="absolute top-24 left-8 w-64 h-64 bg-orange-400/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-24 right-8 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />

      {/* Airplane decorative element */}
      <div className="absolute top-32 right-[15%] opacity-10 hidden md:block">
        <Plane className="w-24 h-24 text-white transform rotate-45" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-8">
        {/* Logo badge */}
        <div className="inline-flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full text-orange-200 text-sm font-medium mb-8 border border-white/15 shadow-lg shadow-black/5">
          <div className="relative w-5 h-5 mr-2.5">
            <Image
              src="/aagamholidays.png"
              alt="Aagam Holidays logo"
              fill
              className="object-contain"
              sizes="20px"
            />
          </div>
          Trusted by 10,000+ Happy Travelers
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
          Discover Your Next{" "}
          <span className="bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
            Adventure
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
          Handcrafted tour packages to the world&apos;s most stunning destinations.
          Experience travel like never before.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 sm:p-2 border border-white/15 shadow-2xl shadow-black/10">
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-3.5">
                <Search className="w-5 h-5 text-orange-400 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="w-full bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none text-sm sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 active:scale-[0.98] text-sm sm:text-base"
              >
                Explore
              </button>
            </div>
          </div>
        </form>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-14">
          {[
            { icon: MapPin, label: "Destinations", value: "50+" },
            { icon: Calendar, label: "Tour Packages", value: "200+" },
            { icon: Users, label: "Happy Travelers", value: "10K+" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                <stat.icon className="w-5 h-5 text-orange-300" />
              </div>
              <div className="text-left">
                <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
