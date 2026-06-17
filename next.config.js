/** @type {import('next').NextConfig} */

function getR2PublicRemotePattern() {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;
  if (!base) {
    return null;
  }

  try {
    const url = new URL(base);
    if (!url.hostname || url.hostname.endsWith('.r2.dev')) {
      return null;
    }

    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
    };
  } catch {
    return null;
  }
}

const r2CustomDomainPattern = getR2PublicRemotePattern();

const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
    ],
  },
  async headers() {
    return [
      {
        // Allow Expo web (localhost:8081) and production mobile app to call public travel APIs
        source: "/api/travel/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        source: "/api/tourPackageBySlug/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/@prisma/client/**/*',
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
    '/(dashboard)/**/*': [
      './node_modules/@prisma/client/**/*',
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
  },
  // Mark Prisma clients as server external packages (works with Turbopack)
  serverExternalPackages: ['@prisma/client', '@prisma/whatsapp-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'naidalleeapiproducts.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.openai.com',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      ...(r2CustomDomainPattern ? [r2CustomDomainPattern] : []),
    ],
  },
}

module.exports = nextConfig
