import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPurchaseItems() {
  try {
    console.log('🔍 Finding purchases with price > 0 but no items...');
    
    // Find all purchases with a price but no items
    const purchasesWithoutItems = await prisma.purchaseDetail.findMany({
      where: {
        price: { gt: 0 },
        items: {
          none: {}
        }
      },
      include: {
        supplier: {
          select: { name: true }
        },
        tourPackageQuery: {
          select: { tourPackageQueryName: true }
        }
      }
    });
    
    console.log(`🧩 Found ${purchasesWithoutItems.length} purchases without items`);
    
    // Create a default item for each purchase
    let fixedCount = 0;
    for (const purchase of purchasesWithoutItems) {
      try {
        const { id, price, tourPackageQuery, description, purchaseDate, supplier, gstAmount } = purchase;
        
        // Determine the product name
        let productName = description || "Purchase";
        if (tourPackageQuery?.tourPackageQueryName) {
          productName = tourPackageQuery.tourPackageQueryName;
        }
        
        console.log(`⚙️ Creating item for purchase ${id} - ${supplier?.name || 'Unknown'} - ${productName} - ${price}`);
        
        // Create a default item for this purchase
        await prisma.purchaseItem.create({
          data: {
            purchaseDetailId: id,
            productName: productName,
            description: description || `${productName} dated ${new Date(purchaseDate).toLocaleDateString()}`,
            quantity: 1,
            pricePerUnit: price,
            totalAmount: price,
            taxAmount: gstAmount || null,
            taxSlabId: null,
            unitOfMeasureId: null
          }
        });
        
        fixedCount++;
        console.log(`✅ Created item for purchase ${id}`);
      } catch (error) {
        console.error(`❌ Error fixing purchase ${purchase.id}:`, error);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} out of ${purchasesWithoutItems.length} purchases`);
    
  } catch (error) {
    console.error('❌ Error fixing purchase items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixPurchaseItems()
  .then(() => console.log('🏁 Script completed'))
  .catch(console.error);
