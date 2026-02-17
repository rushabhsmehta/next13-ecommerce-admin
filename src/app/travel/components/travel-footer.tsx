import Link from "next/link";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";

export function TravelFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Aagam Holidays
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Crafting unforgettable travel experiences with handpicked
              destinations, curated itineraries, and personalized service.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-emerald-400 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/travel/packages" className="hover:text-emerald-400 transition-colors">
                  Tour Packages
                </Link>
              </li>
              <li>
                <Link href="/travel/destinations" className="hover:text-emerald-400 transition-colors">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/travel/chat" className="hover:text-emerald-400 transition-colors">
                  Trip Chat
                </Link>
              </li>
            </ul>
          </div>

          {/* Tour Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4">Tour Categories</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/travel/packages?category=Domestic" className="hover:text-emerald-400 transition-colors">
                  Domestic Tours
                </Link>
              </li>
              <li>
                <Link href="/travel/packages?category=International" className="hover:text-emerald-400 transition-colors">
                  International Tours
                </Link>
              </li>
              <li>
                <Link href="/travel/packages?category=Honeymoon" className="hover:text-emerald-400 transition-colors">
                  Honeymoon Packages
                </Link>
              </li>
              <li>
                <Link href="/travel/packages?category=Adventure" className="hover:text-emerald-400 transition-colors">
                  Adventure Tours
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>info@aagamholidays.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>Ahmedabad, Gujarat, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Aagam Holidays. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
