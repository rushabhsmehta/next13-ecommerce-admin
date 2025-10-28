/** @type {import('next').NextConfig} */
const nextConfig = {
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
      }
    ],
    // Fallback for older format
    domains: [
      "res.cloudinary.com",
      "images.unsplash.com",
      "naidalleeapiproducts.blob.core.windows.net"
    ],
  },
  // Fix Prisma client bundling for Vercel deployment
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': [
        './node_modules/@prisma/whatsapp-client/**/*',
        './node_modules/.prisma/whatsapp-client/**/*',
      ],
      '/(dashboard)/**/*': [
        './node_modules/@prisma/whatsapp-client/**/*',
        './node_modules/.prisma/whatsapp-client/**/*',
      ],
    },
  },
  // Ensure Prisma binaries are included in the output
  outputFileTracing: true,
}

module.exports = nextConfig
