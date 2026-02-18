"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Search,
  Menu,
  X,
  MessageCircle,
  ChevronDown,
  Compass,
  Package,
  Home,
} from "lucide-react";

export function TravelNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-orange-500/5 border-b border-orange-100/50"
          : "bg-white/80 backdrop-blur-md border-b border-gray-100/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/travel" className="flex items-center space-x-2.5 group">
            <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/aagamholidays.png"
                alt="Aagam Holidays"
                fill
                className="object-contain"
                sizes="36px"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-purple-700 bg-clip-text text-transparent leading-tight">
                AAGAM
              </span>
              <span className="text-[9px] font-semibold tracking-[0.2em] text-purple-700/70 -mt-0.5 uppercase">
                Holidays
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {[
              { href: "/travel", label: "Home", icon: Home },
              { href: "/travel/destinations", label: "Destinations", icon: Compass, hasChevron: true },
              { href: "/travel/packages", label: "Tour Packages", icon: Package },
              { href: "/travel/chat", label: "Trip Chat", icon: MessageCircle },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-gray-600 hover:text-orange-600 font-medium transition-all duration-200 px-3.5 py-2 rounded-xl hover:bg-orange-50/60 flex items-center gap-1.5 text-sm group"
              >
                <item.icon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {item.label}
                {item.hasChevron && <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2.5 rounded-xl hover:bg-orange-50 transition-all duration-200 group"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px] text-gray-500 group-hover:text-orange-600 transition-colors" />
            </button>
            <Link
              href="/travel/packages"
              className="hidden sm:inline-flex items-center px-5 py-2 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 hover:-translate-y-px active:translate-y-0"
            >
              Explore Packages
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-orange-50 transition-all duration-200"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                type="text"
                placeholder="Search destinations, packages..."
                className="w-full pl-12 pr-4 py-3 bg-orange-50/50 border border-orange-200/60 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300 transition-all"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-5 pt-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1 bg-gradient-to-b from-orange-50/50 to-transparent rounded-2xl p-3">
              {[
                { href: "/travel", label: "Home", icon: Home },
                { href: "/travel/destinations", label: "Destinations", icon: Compass },
                { href: "/travel/packages", label: "Tour Packages", icon: Package },
                { href: "/travel/chat", label: "Trip Chat", icon: MessageCircle },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-orange-600 font-medium px-4 py-3 rounded-xl hover:bg-white/80 flex items-center gap-3 transition-all duration-200 active:scale-[0.98]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-4.5 h-4.5 text-orange-500/70" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/travel/packages"
                className="mx-2 mt-2 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white text-center rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                onClick={() => setIsMenuOpen(false)}
              >
                Explore All Packages
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
