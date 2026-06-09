"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import {
  TRAVEL_CONTACT_ADDRESS,
  TRAVEL_CONTACT_EMAIL,
  getTravelContactPhoneDisplay,
  getTravelSocialLinks,
} from "@/lib/travel-site-config";
import { useTravelPath } from "./travel-path-provider";

const SOCIAL_ICONS = {
  Instagram,
  Facebook,
  Twitter,
} as const;

export function TravelFooter() {
  const { href } = useTravelPath();
  const phoneDisplay = getTravelContactPhoneDisplay();
  const socialLinks = getTravelSocialLinks();

  const categoryLinks = [
    { path: "/packages?category=Domestic", label: "Domestic Tours" },
    { path: "/packages?category=International", label: "International Tours" },
    { path: "/offers", label: "Special Offers" },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="relative w-32 h-11">
                <Image
                  src="/aagamholidays.png"
                  alt="Aagam Holidays"
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Crafting unforgettable travel experiences with handpicked
              destinations, curated itineraries, and personalized service.
            </p>
            {socialLinks.length > 0 ? (
              <div className="flex space-x-3">
                {socialLinks.map((social) => {
                  const Icon =
                    SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS] ??
                    Instagram;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-200"
                      aria-label={social.label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { path: "/packages", label: "Tour Packages" },
                { path: "/destinations", label: "Destinations" },
                { path: "/privacy", label: "Privacy Policy" },
                { path: "/terms", label: "Terms of Service" },
                { path: "/account-deletion", label: "Delete Account" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    href={href(link.path)}
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
              {categoryLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    href={href(link.path)}
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
              {phoneDisplay ? (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 mt-0.5 text-orange-500/70" />
                  <span>{phoneDisplay}</span>
                </li>
              ) : null}
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 text-orange-500/70" />
                <a
                  href={`mailto:${TRAVEL_CONTACT_EMAIL}`}
                  className="hover:text-orange-400 transition-colors"
                >
                  {TRAVEL_CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-orange-500/70" />
                <span>{TRAVEL_CONTACT_ADDRESS}</span>
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
