import type { MetadataRoute } from "next";
import prismadb from "@/lib/prismadb";
import { locationDestinationSegment } from "@/lib/location-slug";
import { parseTravelPublicHosts } from "@/lib/travel-paths";
import { TRAVEL_GUIDES } from "@/lib/travel-guides";

export const revalidate = 3600;

function travelSiteBaseUrl(): string {
  const host = parseTravelPublicHosts()[0] || "www.aagamholidays.com";
  return `https://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = travelSiteBaseUrl();
  const now = new Date();

  const staticPaths: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1 },
    { path: "/packages", priority: 0.9 },
    { path: "/destinations", priority: 0.9 },
    { path: "/offers", priority: 0.8 },
    { path: "/guides", priority: 0.7 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority,
  }));

  const [packages, locations] = await Promise.all([
    prismadb.tourPackage.findMany({
      where: {
        isFeatured: true,
        isArchived: false,
        slug: { not: null },
      },
      select: { slug: true, updatedAt: true },
    }),
    prismadb.location.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      take: 500,
    }),
  ]);

  const packageEntries: MetadataRoute.Sitemap = packages
    .filter((pkg) => pkg.slug)
    .map((pkg) => ({
      url: `${base}/packages/${pkg.slug}`,
      lastModified: pkg.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const destinationEntries: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${base}/destinations/${locationDestinationSegment(location)}`,
    lastModified: location.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const guideEntries: MetadataRoute.Sitemap = TRAVEL_GUIDES.map((guide) => ({
    url: `${base}/guides/${guide.slug}`,
    lastModified: new Date(guide.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...packageEntries, ...destinationEntries, ...guideEntries];
}
