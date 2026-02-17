"use client";

import { Search, MapPin, Calendar, Users } from "lucide-react";
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
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />

      {/* Animated circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        {/* Badge */}
        <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-emerald-200 text-sm font-medium mb-8 border border-white/20">
          <MapPin className="w-4 h-4 mr-2" />
          Trusted by 10,000+ Happy Travelers
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Discover Your Next{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Adventure
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          Handcrafted tour packages to the world&apos;s most stunning destinations.
          Experience travel like never before.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-3">
                <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="w-full bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                Explore
              </button>
            </div>
          </div>
        </form>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-14">
          {[
            { icon: MapPin, label: "Destinations", value: "50+" },
            { icon: Calendar, label: "Tour Packages", value: "200+" },
            { icon: Users, label: "Happy Travelers", value: "10K+" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 text-white/80">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
