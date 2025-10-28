/**
 * Diagnostic script to check which Prisma client is being used
 * Run this to debug the Notification API issue
 */

import { PrismaClient as MainPrismaClient } from '@prisma/client';
import { PrismaClient as WhatsAppPrismaClient } from '@prisma/whatsapp-client';

async function diagnose() {
  console.log('🔍 Prisma Client Diagnostic\n');

  // Check main client
  console.log('1️⃣ Main Prisma Client (@prisma/client):');
  try {
    const mainClient = new MainPrismaClient();
    console.log('   ✅ Can instantiate');
    console.log('   Database URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    
    // Check if Notification model exists
    if ('notification' in mainClient) {
      console.log('   ✅ Notification model exists');
      await mainClient.$connect();
      console.log('   ✅ Can connect to database');
      await mainClient.$disconnect();
    } else {
      console.log('   ❌ Notification model NOT found');
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n2️⃣ WhatsApp Prisma Client (@prisma/whatsapp-client):');
  try {
    const whatsappClient = new WhatsAppPrismaClient();
    console.log('   ✅ Can instantiate');
    console.log('   Database URL:', process.env.WHATSAPP_DATABASE_URL?.substring(0, 20) + '...');
    
    // Check if Notification model exists (it shouldn't)
    if ('notification' in whatsappClient) {
      console.log('   ⚠️  WARNING: Notification model exists in WhatsApp client!');
    } else {
      console.log('   ✅ Notification model correctly NOT in WhatsApp client');
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n3️⃣ Import Resolution:');
  try {
    const prismadbPath = require.resolve('@/lib/prismadb');
    console.log('   @/lib/prismadb resolves to:', prismadbPath);
    
    const libPrismadbPath = require.resolve('../../lib/prismadb');
    console.log('   ../../lib/prismadb resolves to:', libPrismadbPath);
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n4️⃣ Environment Variables:');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   WHATSAPP_DATABASE_URL:', process.env.WHATSAPP_DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   NODE_ENV:', process.env.NODE_ENV);

  console.log('\n✅ Diagnostic complete');
}

diagnose().catch(console.error);
