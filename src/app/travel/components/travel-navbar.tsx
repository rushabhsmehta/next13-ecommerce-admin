"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Home, Search, X, LogIn, MessageCircle, LogOut } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTravelPath } from "./travel-path-provider";

export function TravelNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { href, home } = useTravelPath();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [travelUserName, setTravelUserName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const { isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/travel-auth/profile")
        .then((r) => r.json())
        .then((data) => setTravelUserName(data?.name ?? null))
        .catch(() => setTravelUserName(null));
    } else {
      setTravelUserName(null);
    }
  }, [isSignedIn]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inDesktop = dropdownRef.current?.contains(target);
      const inMobile = mobileDropdownRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSignOut() {
    signOut(() => router.push(home));
    setDropdownOpen(false);
  }

  const isActive = (path: string) => {
    const target = href(path);
    return pathname === target || (target !== home && pathname?.startsWith(target));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    router.push(href(`/packages?search=${encodeURIComponent(query)}`));
    setSearchOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-orange-500/5 border-b border-orange-100/50"
          : "bg-white/80 backdrop-blur-md border-b border-gray-100/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo */}
          <div className="flex items-center justify-between gap-3 sm:justify-start sm:flex-shrink-0">
            <Link href={home} className="flex items-center group">
              <div className="relative w-24 h-8 sm:w-32 sm:h-11 transition-transform duration-300 group-hover:scale-[1.02]">
                <Image
                  src="/aagamholidays.png"
                  alt="Aagam Holidays"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 96px, 128px"
                />
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${
                  searchOpen
                    ? "border-orange-200 bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:text-orange-600"
                }`}
                aria-label="Search"
                aria-expanded={searchOpen}
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
              <Link
                href={home}
                className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive("/")
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Home className="w-4 h-4" />
              </Link>

              {/* Auth — mobile */}
              {isLoaded && (
                isSignedIn && travelUserName ? (
                  <div className="relative" ref={mobileDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white text-sm font-bold shadow-md"
                    >
                      {travelUserName.charAt(0).toUpperCase()}
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-50">
                          {travelUserName}
                        </p>
                        <Link
                          href={href("/chat")}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                        >
                          <MessageCircle className="w-4 h-4" />
                          My Chats
                        </Link>
                        <hr className="my-1 border-gray-100" />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                ) : !isSignedIn ? (
                  <Link
                    href={href("/login")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md"
                    aria-label="Login"
                  >
                    <LogIn className="h-4 w-4" />
                  </Link>
                ) : null
              )}
            </div>
          </div>

          <form onSubmit={handleSearch} className="hidden sm:block sm:flex-1 sm:max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/95 px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 flex-shrink-0 text-orange-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages, destinations..."
                className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                aria-label="Search travel packages"
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:shadow-md hover:shadow-orange-500/20"
              >
                Search
              </button>
            </div>
          </form>

          {searchOpen ? (
            <form onSubmit={handleSearch} className="sm:hidden">
              <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/95 px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 flex-shrink-0 text-orange-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search packages, destinations..."
                  className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  autoFocus
                  aria-label="Search travel packages"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:shadow-md hover:shadow-orange-500/20"
                >
                  Go
                </button>
              </div>
            </form>
          ) : null}

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <Link
              href={home}
              className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive("/")
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>

            {/* Auth section — desktop */}
            {isLoaded && (
              isSignedIn && travelUserName ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-lg transition-shadow"
                    aria-label="User menu"
                  >
                    {travelUserName.charAt(0).toUpperCase()}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-50">
                        {travelUserName}
                      </p>
                      <Link
                        href={href("/chat")}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        My Chats
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : !isSignedIn ? (
                <Link
                  href={href("/login")}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:from-orange-600 hover:to-red-600 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              ) : null
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
