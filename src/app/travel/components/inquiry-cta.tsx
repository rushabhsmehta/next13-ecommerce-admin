"use client";

import Link from "next/link";
import { MessageCircle, Package, Sparkles } from "lucide-react";
import { useTravelPath } from "./travel-path-provider";

export function InquiryCta() {
  const { href } = useTravelPath();
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 p-8 sm:p-12 lg:p-16">
          {/* Background decorations */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>

          {/* Floating decorative elements */}
          <div className="absolute top-6 right-8 opacity-30 hidden sm:block">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="absolute bottom-8 right-1/4 opacity-20 hidden lg:block">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Text */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3 h-3" /> Custom Itineraries
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                Ready to Plan Your Dream Trip?
              </h2>
              <p className="text-white/80 mt-3 text-sm sm:text-base leading-relaxed">
                Tell us your travel dates, preferred destinations, and group
                size — we&apos;ll craft a personalised itinerary just for you.
                Free consultation, no obligation.
              </p>

              {/* Trust indicators */}
              <div className="flex items-center gap-4 mt-5 flex-wrap">
                {["Free Customisation", "24/7 Support", "Best Price"].map(
                  (badge) => (
                    <span
                      key={badge}
                      className="flex items-center gap-1.5 text-white/90 text-xs font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      {badge}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[220px]">
              <Link
                href={href("/chat")}
                className="inline-flex items-center justify-center gap-2.5 bg-white text-orange-600 font-semibold px-6 py-3.5 rounded-xl hover:bg-orange-50 transition-colors shadow-lg shadow-black/10 text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Start Planning
              </Link>
              <Link
                href={href("/packages")}
                className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/30 text-sm sm:text-base"
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                Browse Packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
