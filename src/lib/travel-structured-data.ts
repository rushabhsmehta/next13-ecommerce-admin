import {
  TRAVEL_CONTACT_ADDRESS,
  TRAVEL_CONTACT_EMAIL,
  getTravelContactPhoneDisplay,
  getTravelSocialLinks,
} from "@/lib/travel-site-config";
import { plainPackageTitle } from "@/lib/travel-display";
import { parseTravelPublicHosts } from "@/lib/travel-paths";

export function travelSiteOrigin(): string {
  const host = parseTravelPublicHosts()[0] || "www.aagamholidays.com";
  return `https://${host}`;
}

export function buildTravelAgencyJsonLd() {
  const origin = travelSiteOrigin();
  const phone = getTravelContactPhoneDisplay();
  const social = getTravelSocialLinks().map((s) => s.href);

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Aagam Holidays",
    url: origin,
    logo: `${origin}/aagamholidays.png`,
    email: TRAVEL_CONTACT_EMAIL,
    ...(phone ? { telephone: phone } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ahmedabad",
      addressRegion: "Gujarat",
      addressCountry: "IN",
      streetAddress: TRAVEL_CONTACT_ADDRESS,
    },
    ...(social.length > 0 ? { sameAs: social } : {}),
  };
}

export function buildTouristTripJsonLd(input: {
  name: string | null;
  description?: string | null;
  slug: string | null;
  id: string;
  locationLabel?: string | null;
  duration?: string | null;
  imageUrl?: string | null;
}) {
  const origin = travelSiteOrigin();
  const title = plainPackageTitle(input.name);
  const path = input.slug ? `/packages/${input.slug}` : `/packages/${input.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description:
      input.description ||
      [input.duration, input.locationLabel ? `Tour in ${input.locationLabel}` : null]
        .filter(Boolean)
        .join(" — ") ||
      title,
    url: `${origin}${path}`,
    touristType: "Leisure",
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    provider: {
      "@type": "TravelAgency",
      name: "Aagam Holidays",
      url: origin,
    },
  };
}

export function buildArticleJsonLd(guide: {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}) {
  const origin = travelSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt,
    url: `${origin}/guides/${guide.slug}`,
    datePublished: guide.publishedAt,
    author: {
      "@type": "Organization",
      name: "Aagam Holidays",
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: "Aagam Holidays",
      logo: {
        "@type": "ImageObject",
        url: `${origin}/aagamholidays.png`,
      },
    },
  };
}

export function buildDestinationJsonLd(input: {
  name: string;
  slug: string | null;
  id: string;
  imageUrl?: string | null;
  packageCount: number;
}) {
  const origin = travelSiteOrigin();
  const segment = input.slug?.trim() || input.id;

  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: input.name,
    description: `${input.packageCount} tour ${
      input.packageCount === 1 ? "package" : "packages"
    } available in ${input.name} from Aagam Holidays.`,
    url: `${origin}/destinations/${segment}`,
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
  };
}
