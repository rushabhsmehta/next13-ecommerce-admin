import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";

export function TravelFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="relative w-9 h-9">
                <Image
                  src="/aagamholidays.png"
                  alt="Aagam Holidays"
                  fill
                  className="object-contain"
                  sizes="36px"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent leading-tight">
                  AAGAM
                </span>
                <span className="text-xs font-semibold tracking-[0.2em] text-purple-400/60 -mt-0.5 uppercase">
                  Holidays
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Crafting unforgettable travel experiences with handpicked
              destinations, curated itineraries, and personalized service.
            </p>
            <div className="flex space-x-3">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Facebook, label: "Facebook" },
                { icon: Twitter, label: "Twitter" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/travel/packages", label: "Tour Packages" },
                { href: "/travel/destinations", label: "Destinations" },
                { href: "/travel/chat", label: "Trip Chat" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tour Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Tour Categories</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/travel/packages?category=Domestic", label: "Domestic Tours" },
                { href: "/travel/packages?category=International", label: "International Tours" },
                { href: "/travel/packages?category=Honeymoon", label: "Honeymoon Packages" },
                { href: "/travel/packages?category=Adventure", label: "Adventure Tours" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 text-orange-500/70" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 text-orange-500/70" />
                <span>info@aagamholidays.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-orange-500/70" />
                <span>Ahmedabad, Gujarat, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 sm:mt-12 pt-8 text-center text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} Aagam Holidays. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
