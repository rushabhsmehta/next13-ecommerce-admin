// Script to check all conversations in the database
// Run: node scripts/tests/all-conversations.js

const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { PrismaClient: WhatsAppPrisma } = require('@prisma/whatsapp-client');

async function checkAllConversations() {
  try {
    console.log('\n' + '═'.repeat(90));
    console.log('                    ALL WHATSAPP CONVERSATIONS IN DATABASE');
    console.log('═'.repeat(90));

    const whatsappPrisma = new WhatsAppPrisma();
    
    // Get all messages
    const allMessages = await whatsappPrisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        whatsappCustomer: true,
      },
    });

    console.log(`\n📊 Total messages in database: ${allMessages.length}\n`);

    if (allMessages.length === 0) {
      console.log('❌ No messages found in database!');
      await whatsappPrisma.$disconnect();
      return;
    }

    // Group by unique phone numbers
    const conversationMap = {};
    
    allMessages.forEach(msg => {
      const from = msg.from?.replace(/whatsapp:/i, '') || 'unknown';
      const to = msg.to?.replace(/whatsapp:/i, '') || 'unknown';
      
      // Determine the contact phone (customer)
      let contactPhone = null;
      if (msg.direction === 'inbound' || msg.direction === 'in') {
        // Inbound: from is the customer
        contactPhone = from;
      } else if (msg.direction === 'outbound' || msg.direction === 'out') {
        // Outbound: to is the customer
        contactPhone = to;
      }

      if (!contactPhone) return;

      if (!conversationMap[contactPhone]) {
        conversationMap[contactPhone] = {
          phone: contactPhone,
          outbound: [],
          inbound: [],
          outboundCount: 0,
          inboundCount: 0,
          lastMessage: null,
          lastMessageTime: null,
          customerName: null,
        };
      }

      if (msg.direction === 'outbound' || msg.direction === 'out') {
        conversationMap[contactPhone].outbound.push(msg);
        conversationMap[contactPhone].outboundCount++;
      } else {
        conversationMap[contactPhone].inbound.push(msg);
        conversationMap[contactPhone].inboundCount++;
      }

      // Get customer name
      if (msg.whatsappCustomer) {
        conversationMap[contactPhone].customerName = 
          `${msg.whatsappCustomer.firstName || ''} ${msg.whatsappCustomer.lastName || ''}`.trim();
      }

      // Get last message info
      if (!conversationMap[contactPhone].lastMessageTime || 
          new Date(msg.createdAt) > conversationMap[contactPhone].lastMessageTime) {
        conversationMap[contactPhone].lastMessage = msg.message?.substring(0, 60) || '[Media]';
        conversationMap[contactPhone].lastMessageTime = new Date(msg.createdAt);
      }
    });

    const conversationCount = Object.keys(conversationMap).length;
    console.log(`📞 Unique phone numbers with conversations: ${conversationCount}\n`);
    console.log('─'.repeat(90));

    // Sort by latest message
    const sortedConversations = Object.entries(conversationMap)
      .sort((a, b) => {
        const timeA = a[1].lastMessageTime ? new Date(a[1].lastMessageTime) : new Date(0);
        const timeB = b[1].lastMessageTime ? new Date(b[1].lastMessageTime) : new Date(0);
        return timeB - timeA;
      });

    // Display conversations
    sortedConversations.forEach(([phone, data], idx) => {
      const lastTime = data.lastMessageTime 
        ? new Date(data.lastMessageTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : 'N/A';
      
      const totalMessages = data.outboundCount + data.inboundCount;
      
      console.log(`\n[${idx + 1}] Phone: ${phone}`);
      if (data.customerName) {
        console.log(`    Name: ${data.customerName}`);
      }
      console.log(`    📤 Sent: ${data.outboundCount}`);
      console.log(`    📨 Received: ${data.inboundCount}`);
      console.log(`    📊 Total: ${totalMessages}`);
      console.log(`    ⏰ Last Message: ${lastTime}`);
      console.log(`    💬 Preview: ${data.lastMessage}`);
    });

    console.log('\n' + '═'.repeat(90));
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Conversations: ${conversationCount}`);
    console.log(`   Total Messages: ${allMessages.length}`);
    
    const totalOutbound = allMessages.filter(m => m.direction === 'outbound' || m.direction === 'out').length;
    const totalInbound = allMessages.filter(m => m.direction === 'inbound' || m.direction === 'in').length;
    
    console.log(`   Total Sent: ${totalOutbound}`);
    console.log(`   Total Received: ${totalInbound}`);
    console.log(`   Avg Messages per Conversation: ${(allMessages.length / conversationCount).toFixed(1)}`);

    // Show breakdown by message type
    console.log(`\n📋 MESSAGE TYPES:`);
    const typeMap = {};
    allMessages.forEach(msg => {
      const type = msg.metadata?.whatsappType || msg.metadata?.templateName || 'text';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    
    Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

    console.log('\n' + '═'.repeat(90) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P1011') {
      console.error('\n⚠️  Database connection error. Check your database URL.');
    }
  } finally {
    await whatsappPrisma.$disconnect();
    process.exit(0);
  }
}

checkAllConversations();
