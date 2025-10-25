import { PrismaClient } from "@prisma/client";

// Use a more robust singleton pattern
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Create the client with connection management options
const prismadb = globalForPrisma.prisma || 
  new PrismaClient({
    log: ["error", "warn"], // Only log errors and warnings, not queries
    // Connection management is handled by the singleton pattern
  });

// Only save the instance in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismadb;
}

// Add comprehensive shutdown handlers for proper cleanup
if (typeof window === "undefined") {
  const globalForHandlers = global as unknown as { prismaHandlersRegistered?: boolean };

  if (!globalForHandlers.prismaHandlersRegistered) {
    globalForHandlers.prismaHandlersRegistered = true;

    // Server-side only
    process.on("beforeExit", async () => {
      await prismadb.$disconnect();
    });

    // Handle termination signals
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received - disconnecting Prisma Client");
      await prismadb.$disconnect();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT received - disconnecting Prisma Client");
      await prismadb.$disconnect();
      process.exit(0);
    });
  }
}

export default prismadb;