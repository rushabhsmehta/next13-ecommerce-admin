/**
 * Script to link existing WhatsApp messages to WhatsAppCustomer records
 * based on phone numbers
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️  Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Normalize phone number to match WhatsApp format
 * Removes 'whatsapp:' prefix and normalizes to E.164 format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove 'whatsapp:' prefix if present
  let normalized = phone.replace(/^whatsapp:/, '');
  
  // Remove any non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  // Add + prefix if not present
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

async function linkMessagesToCustomers() {
  console.log('🔗 Starting to link WhatsApp messages to customers...\n');

  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    await retryWithBackoff(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    console.log('✅ Database connection successful\n');

    // Fetch all WhatsApp customers
    const customers = await retryWithBackoff(async () => {
      return await prisma.whatsAppCustomer.findMany({
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
        },
      });
    });

    console.log(`📋 Found ${customers.length} WhatsApp customers\n`);

    // Create a map of phone numbers to customer IDs
    const phoneToCustomerMap = new Map();
    customers.forEach(customer => {
      const normalizedPhone = normalizePhoneNumber(customer.phoneNumber);
      if (normalizedPhone) {
        phoneToCustomerMap.set(normalizedPhone, customer);
      }
    });

    // Fetch messages that don't have a whatsappCustomerId
    const messages = await retryWithBackoff(async () => {
      return await prisma.whatsAppMessage.findMany({
        where: {
          whatsappCustomerId: null,
        },
        select: {
          id: true,
          from: true,
          to: true,
          direction: true,
        },
      });
    });

    console.log(`📨 Found ${messages.length} messages without customer links\n`);

    let linkedCount = 0;
    let notFoundCount = 0;

    // Process messages in smaller batches to avoid connection pool issues
    const batchSize = 50;
    const concurrentUpdates = 5; // Limit concurrent database operations
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const updates = [];
      
      for (const message of batch) {
        // Determine which phone number to use based on direction
        const phoneToMatch = message.direction === 'inbound' 
          ? normalizePhoneNumber(message.from)
          : normalizePhoneNumber(message.to);
        
        if (!phoneToMatch) continue;

        const customer = phoneToCustomerMap.get(phoneToMatch);
        
        if (customer) {
          updates.push({
            messageId: message.id,
            customerId: customer.id,
          });
          linkedCount++;
        } else {
          notFoundCount++;
        }
      }

      // Execute batch updates with limited concurrency and retry logic
      if (updates.length > 0) {
        // Split updates into smaller chunks for concurrent execution
        for (let j = 0; j < updates.length; j += concurrentUpdates) {
          const chunk = updates.slice(j, j + concurrentUpdates);
          
          await retryWithBackoff(async () => {
            await Promise.all(
              chunk.map(update =>
                prisma.whatsAppMessage.update({
                  where: { id: update.messageId },
                  data: { whatsappCustomerId: update.customerId },
                })
              )
            );
          });
          
          // Add a small delay between chunks to avoid overwhelming the database
          if (j + concurrentUpdates < updates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        console.log(`✅ Linked batch ${Math.floor(i / batchSize) + 1}: ${updates.length} messages`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully linked: ${linkedCount} messages`);
    console.log(`⚠️  No customer found: ${notFoundCount} messages`);
    console.log(`📝 Total processed: ${messages.length} messages`);

    if (notFoundCount > 0) {
      console.log('\n💡 Tip: Messages without matching customers may have phone numbers');
      console.log('   not yet added to the WhatsApp Customer list.');
    }

  } catch (error) {
    console.error('❌ Error linking messages to customers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
linkMessagesToCustomers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
