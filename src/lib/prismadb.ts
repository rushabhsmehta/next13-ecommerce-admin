// Re-export the main prisma client from lib/prismadb.ts
// This ensures consistent imports whether using @/lib/prismadb or ../../lib/prismadb

import prismadb from "../../lib/prismadb";

export default prismadb;

