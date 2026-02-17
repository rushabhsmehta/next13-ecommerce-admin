"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MapPin,
  Search,
  Menu,
  X,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

export function TravelNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/travel" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Aagam Holidays
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/travel"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/travel/destinations"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors flex items-center gap-1"
            >
              Destinations <ChevronDown className="w-4 h-4" />
            </Link>
            <Link
              href="/travel/packages"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
            >
              Tour Packages
            </Link>
            <Link
              href="/travel/chat"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-4 h-4" /> Trip Chat
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <Link
              href="/travel/packages"
              className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
            >
              Explore Packages
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
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
          <div className="pb-4 animate-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search destinations, packages..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col space-y-3">
              <Link
                href="/travel"
                className="text-gray-700 hover:text-emerald-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/travel/destinations"
                className="text-gray-700 hover:text-emerald-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Destinations
              </Link>
              <Link
                href="/travel/packages"
                className="text-gray-700 hover:text-emerald-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Tour Packages
              </Link>
              <Link
                href="/travel/chat"
                className="text-gray-700 hover:text-emerald-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <MessageCircle className="w-4 h-4" /> Trip Chat
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
