export type TravelGuideSection = {
  heading?: string;
  paragraphs: string[];
};

export type TravelGuide = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  publishedAt: string;
  sections: TravelGuideSection[];
  tips?: string[];
  relatedLinks?: { label: string; path: string }[];
};

export const TRAVEL_GUIDES: TravelGuide[] = [
  {
    slug: "best-time-to-visit-kashmir",
    title: "Best Time to Visit Kashmir for Families",
    excerpt:
      "Spring blooms, summer meadows, autumn colour, or winter snow — how to pick the right Kashmir season for your group.",
    category: "Destinations",
    readMinutes: 5,
    publishedAt: "2025-11-01",
    sections: [
      {
        paragraphs: [
          "Kashmir rewards travellers in every season, but the experience changes dramatically. Families from Gujarat often plan around school holidays, so matching your dates to weather and road conditions matters as much as the itinerary itself.",
        ],
      },
      {
        heading: "March to May — spring & early summer",
        paragraphs: [
          "Tulip gardens, mild days, and clear views make this the most popular window for Srinagar, Gulmarg, and Pahalgam. Expect higher demand around Easter and summer breaks; book houseboats and flights early.",
        ],
      },
      {
        heading: "June to August — peak family season",
        paragraphs: [
          "Pleasant temperatures in the valleys, though occasional rain is normal. Ideal if children are on holiday and you want shikara rides, pony rides, and day trips without heavy winter gear.",
        ],
      },
      {
        heading: "September to November — autumn colour",
        paragraphs: [
          "Fewer crowds, crisp air, and golden chinar trees. A strong choice for couples and seniors who prefer quieter sightseeing and comfortable daytime temperatures.",
        ],
      },
      {
        heading: "December to February — snow experiences",
        paragraphs: [
          "Gulmarg skiing and snow activities draw winter lovers. Check flight schedules and carry warm layers; some high passes may be weather-dependent.",
        ],
      },
    ],
    tips: [
      "Carry photo ID for all travellers — it is checked at several points.",
      "Allow a buffer day for weather on mountain drives.",
      "Ask about child-friendly rooming before confirming houseboats.",
    ],
    relatedLinks: [
      { label: "Kashmir packages", path: "/packages?search=kashmir" },
      { label: "All destinations", path: "/destinations" },
    ],
  },
  {
    slug: "planning-your-gujarat-tour",
    title: "Planning Your First Gujarat Heritage Tour",
    excerpt:
      "A practical order for Statue of Unity, Rann of Kutch, Gir, and temple circuits — without rushing the drive times.",
    category: "Domestic",
    readMinutes: 6,
    publishedAt: "2025-10-15",
    sections: [
      {
        paragraphs: [
          "Gujarat packs desert, coastline, wildlife, and UNESCO sites into one state. First-time visitors often try to cover everything in five days — workable only if you cluster regions and travel overnight strategically.",
        ],
      },
      {
        heading: "Start with your anchor attraction",
        paragraphs: [
          "Pick one must-see (Statue of Unity, Rann Utsav dates, or Gir safari) and build outward. Safari permits and festival weekends sell out first, so lock those before hotels.",
        ],
      },
      {
        heading: "Suggested 7-day rhythm",
        paragraphs: [
          "Days 1–2: Ahmedabad or Vadodara heritage plus local cuisine. Days 3–4: Statue of Unity and Saputara or Surat depending on direction. Days 5–6: Kutch for white desert (Nov–Feb) or Bhuj crafts. Day 7: buffer for shopping or flight buffer.",
        ],
      },
      {
        heading: "Getting around",
        paragraphs: [
          "Private tempo traveller or SUV works best for families with luggage. Train connections are good between major cities but add last-mile transfers for national parks and the Rann.",
        ],
      },
    ],
    tips: [
      "Rann of Kutch is best on full-moon weekends Nov–Feb — confirm dates before booking.",
      "Gir safari quotas are limited; book morning slots in advance.",
      "Carry cash in remote villages; UPI is common in cities but not everywhere.",
    ],
    relatedLinks: [
      { label: "Domestic packages", path: "/packages?category=Domestic" },
      { label: "Request a callback", path: "/#callback" },
    ],
  },
  {
    slug: "domestic-vs-international-tours",
    title: "Domestic vs International: How to Choose Your Next Trip",
    excerpt:
      "Passport readiness, budget bands, and how much planning time you need before booking with a tour operator.",
    category: "Planning",
    readMinutes: 4,
    publishedAt: "2025-09-20",
    sections: [
      {
        paragraphs: [
          "Neither option is automatically better — the right choice depends on passport validity, visa timelines, school holidays, and how much hand-holding you want on the ground.",
        ],
      },
      {
        heading: "When domestic tours make sense",
        paragraphs: [
          "Shorter planning cycles, easier last-minute departures, and no forex hassle. Strong for multi-generation families, first-time group travel, and festivals tied to Indian calendars.",
        ],
      },
      {
        heading: "When international tours make sense",
        paragraphs: [
          "You have passports valid for six-plus months, visa lead time (Dubai, Thailand, Singapore are faster; Europe and UK need more paperwork), and a clear budget for flights plus land package.",
        ],
      },
      {
        heading: "Budget reality check",
        paragraphs: [
          "International trips often cost more in flights than land cost. Domestic packages can offer more days on ground for the same total budget. Compare all-in quotes, not just per-day hotel rates.",
        ],
      },
    ],
    tips: [
      "Scan passport copies for all travellers before enquiring internationally.",
      "Ask for GST-inclusive quotes and what is excluded (tips, optional tours).",
      "Peak Indian holiday weeks affect both domestic and outbound flight prices.",
    ],
    relatedLinks: [
      { label: "International packages", path: "/packages?category=International" },
      { label: "Domestic packages", path: "/packages?category=Domestic" },
    ],
  },
  {
    slug: "family-trip-planning-checklist",
    title: "Family Trip Planning Checklist Before You Book",
    excerpt:
      "Rooming, meals, pace, and documents — the questions worth answering before you pay a deposit.",
    category: "Planning",
    readMinutes: 5,
    publishedAt: "2025-08-10",
    sections: [
      {
        paragraphs: [
          "Most post-booking friction comes from assumptions: twin beds vs triple sharing, vegetarian meal availability, or whether a toddler counts as a full seat on a tempo traveller. Clarify these upfront.",
        ],
      },
      {
        heading: "Traveller list & documents",
        paragraphs: [
          "Full names as on ID, ages of children, and any medical considerations. For flights or trains included in the package, spelling errors are costly to fix later.",
        ],
      },
      {
        heading: "Pace & daily schedule",
        paragraphs: [
          "With seniors or young kids, cap sightseeing at one major stop per half-day. Ask for approximate drive times between cities — maps apps underestimate mountain or monsoon roads.",
        ],
      },
      {
        heading: "Payments & cancellation",
        paragraphs: [
          "Understand deposit amount, balance due date, and cancellation charges per hotel and transport policy. Festival and peak-season bookings are usually stricter.",
        ],
      },
    ],
    tips: [
      "Request a day-by-day PDF before paying the balance.",
      "Confirm pick-up point for the first day (airport, station, or hotel).",
      "Save your coordinator's WhatsApp number — it is faster than email on tour days.",
    ],
    relatedLinks: [
      { label: "Browse packages", path: "/packages" },
      { label: "Contact us", path: "/packages" },
    ],
  },
];

export function getTravelGuide(slug: string): TravelGuide | undefined {
  return TRAVEL_GUIDES.find((g) => g.slug === slug);
}

export function getFeaturedTravelGuides(limit = 3): TravelGuide[] {
  return TRAVEL_GUIDES.slice(0, limit);
}
