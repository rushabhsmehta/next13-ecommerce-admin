// Re-export the main prisma client to prevent duplicate connections
const prisma = require('../../../lib/prismadb');

module.exports = prisma;
