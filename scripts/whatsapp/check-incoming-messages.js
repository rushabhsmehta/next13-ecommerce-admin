#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function checkIncoming() {
  const prisma = new PrismaClient();

  try {
    const incoming = await prisma.whatsAppMessage.findMany({
      where: {
        direction: 'inbound'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\n📥 Incoming messages: ${incoming.length}\n`);
    
    incoming.forEach(msg => {
      console.log(`FROM: ${msg.from}`);
      console.log(`MESSAGE: ${msg.message}`);
      console.log(`TIME: ${msg.createdAt}`);
      console.log(`STATUS: ${msg.status}`);
      console.log('─'.repeat(50));
    });

  } finally {
    await prisma.$disconnect();
  }
}

checkIncoming();
