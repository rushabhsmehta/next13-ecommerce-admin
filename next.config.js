/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // mcp-server contracts use .js extensions (NodeNext ESM convention) but are
  // imported directly by the Next.js app. Tell webpack to resolve .js → .ts
  // so the TypeScript source files are found during production builds.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
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
      }
    ],
  },
}

module.exports = nextConfig
