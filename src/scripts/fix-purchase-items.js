// Script to fix purchases that have prices but no items
// Run this script to add default items to any purchases that are missing them
import prismadb from '../../lib/prismadb';

// Use our existing prisma client
const prisma = prismadb;

async function fixPurchaseItems() {
  console.log('🛠️ Starting purchase items fix...');
  
  try {
    // Find all purchases that have a price but no items
    const purchasesWithoutItems = await prisma.purchaseDetail.findMany({
      where: {
        price: { gt: 0 },
        items: {
          none: {}
        }
      },
      include: {
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true
          }
        },
        supplier: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Found ${purchasesWithoutItems.length} purchases with prices but no items`);
    
    // Create items for each purchase
    for (const purchase of purchasesWithoutItems) {
      const productName = purchase.description || 
                          purchase.tourPackageQuery?.tourPackageQueryName || 
                          `Purchase from ${purchase.supplier?.name || 'Unknown'}`;
      
      try {
        await prisma.purchaseItem.create({
          data: {
            purchaseDetailId: purchase.id,
            productName: productName,
            description: purchase.description || `${productName} dated ${purchase.purchaseDate.toLocaleDateString()}`,
            quantity: 1,
            pricePerUnit: purchase.price,
            totalAmount: purchase.price,
            taxAmount: purchase.gstAmount || null,
            taxSlabId: null,
            unitOfMeasureId: null
          }
        });
        
        console.log(`✅ Created item for purchase ID: ${purchase.id} with product: ${productName}`);
      } catch (error) {
        console.error(`❌ Error creating item for purchase ID: ${purchase.id}`, error);
      }
    }
    
    console.log(`🎉 Finished fixing ${purchasesWithoutItems.length} purchases`);
  } catch (error) {
    console.error('Error fixing purchase items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
(async () => {
  try {
    await fixPurchaseItems();
    console.log('Script completed');
  } catch (error) {
    console.error('Script error:', error);
  }
})();
