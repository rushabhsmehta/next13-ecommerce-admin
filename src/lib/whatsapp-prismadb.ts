/**
 * WhatsApp Prisma Client - PostgreSQL Database
 * 
 * This is a separate Prisma client instance for the WhatsApp integration.
 * It connects to a PostgreSQL database while the main app uses MySQL.
 * 
 * Benefits:
 * - Independent scaling for WhatsApp features
 * - PostgreSQL optimizations (JSONB, full-text search, arrays)
 * - Better performance for chat/campaign workloads
 * - Isolated from main business data
 */

import { PrismaClient } from '@prisma/whatsapp-client';

// Singleton pattern for Prisma client
const globalForWhatsAppPrisma = global as unknown as {
  whatsappPrisma: PrismaClient | undefined;
};

export const whatsappPrisma =
  globalForWhatsAppPrisma.whatsappPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForWhatsAppPrisma.whatsappPrisma = whatsappPrisma;
}

export default whatsappPrisma;
