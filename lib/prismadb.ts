import { PrismaClient } from "@prisma/client";

// Use a global variable to maintain a single instance in development.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prismadb =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismadb;

export default prismadb;