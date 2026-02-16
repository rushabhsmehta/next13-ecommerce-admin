/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation for environment validation at startup
  experimental: {
    instrumentationHook: true,
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
  },
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
    // Fallback for older format
    domains: [
      "res.cloudinary.com",
      "images.unsplash.com",
      "naidalleeapiproducts.blob.core.windows.net"
    ],
  },
  // Ensure Prisma binaries are included in the output
  outputFileTracing: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
        '@prisma/whatsapp-client': 'commonjs @prisma/whatsapp-client',
      });
    }
    return config;
  },
}

module.exports = nextConfig
