"use client";

import { MessageCircle } from "lucide-react";
import { getTravelWhatsAppUrl } from "@/lib/travel-site-config";

const DEFAULT_MESSAGE =
  "Hi Aagam Holidays! I'd like help planning a trip. Can you assist me?";

export function TravelWhatsAppFab() {
  const href = getTravelWhatsAppUrl(DEFAULT_MESSAGE);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-600/30 transition hover:scale-105 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 sm:bottom-6 sm:right-6"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
