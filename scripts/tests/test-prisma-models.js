const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('Available models:');
console.log(Object.keys(prisma));
console.log('\nLooking for WhatsApp models:');
console.log(Object.keys(prisma).filter(key => key.toLowerCase().includes('whatsapp')));

prisma.$disconnect();
