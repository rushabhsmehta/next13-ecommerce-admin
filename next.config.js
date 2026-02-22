/** @type {import('next').NextConfig} */
const nextConfig = {
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
