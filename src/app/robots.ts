import type { MetadataRoute } from "next";
import { parseTravelPublicHosts } from "@/lib/travel-paths";

export default function robots(): MetadataRoute.Robots {
  const host = parseTravelPublicHosts()[0] || "www.aagamholidays.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/sign-in", "/sign-up"],
    },
    sitemap: `https://${host}/sitemap.xml`,
  };
}
