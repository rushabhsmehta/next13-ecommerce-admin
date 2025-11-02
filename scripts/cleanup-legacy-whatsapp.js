#!/usr/bin/env node

/**
 * Removes legacy WhatsApp records that belonged to Twilio or Meta Cloud integrations.
 *
 * Usage:
 *   node scripts/cleanup-legacy-whatsapp.js
 *
 * Optional environment variables:
 *   LEGACY_WHATSAPP_NUMBERS=whatsapp:+919898744701,whatsapp:+14155238886
 *     Comma-separated list of full WhatsApp addresses (with or without the prefix)
 *     that should be purged from Prisma.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/whatsapp-client');

const prisma = new PrismaClient();

function normalizeNumber(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed.replace(/^[+]+/, '+')}`;
}

async function main() {
  const legacyNumbersEnv = process.env.LEGACY_WHATSAPP_NUMBERS || '';
  const legacyNumbers = legacyNumbersEnv
    .split(',')
    .map(normalizeNumber)
    .filter(Boolean);

  const numberFilters = [];
  legacyNumbers.forEach(number => {
    numberFilters.push({ from: number });
    numberFilters.push({ to: number });
  });

  const messageWhere = {
    OR: [
      { messageSid: { startsWith: 'SM' } }, // Twilio SIDs
      { messageSid: { startsWith: 'wamid.' } }, // Meta Cloud message ids
      ...numberFilters,
    ],
  };

  if (messageWhere.OR.length === 0) {
    console.log('No legacy filters configured. Set LEGACY_WHATSAPP_NUMBERS or run with historic env vars.');
    await prisma.$disconnect();
    process.exit(0);
  }

  try {
    console.log('🧹 Removing legacy WhatsApp messages…');
    const deletedMessages = await prisma.whatsAppMessage.deleteMany({ where: messageWhere });
    console.log(`   Deleted ${deletedMessages.count} WhatsAppMessage rows.`);

    console.log('🧹 Removing legacy WhatsApp templates…');
    const deletedTemplates = await prisma.whatsAppTemplate.deleteMany({
      where: {
        OR: [
          { name: { contains: 'twilio' } },
          { name: { contains: 'cloud' } },
          { name: { contains: 'Twilio' } },
          { name: { contains: 'Cloud' } },
        ],
      },
    });
    console.log(`   Deleted ${deletedTemplates.count} WhatsAppTemplate rows.`);

    console.log('✅ Legacy cleanup complete.');
  } catch (error) {
    console.error('❌ Failed to clean up legacy data:', error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
