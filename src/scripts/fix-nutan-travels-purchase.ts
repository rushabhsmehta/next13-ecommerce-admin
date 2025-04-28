import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNutanTravelsPurchase() {
  try {
    console.log('🔍 Finding the Nutan Travels purchase...');
    
    // Find the specific Nutan Travels purchase
    const nutanPurchase = await prisma.purchaseDetail.findFirst({
      where: {
        id: '75aeb677-26ad-4db7-9d56-839343419ed7',
        // Backup filters in case ID changes
        supplier: {
          name: {
            contains: 'NUTAN TRAVELS'
          }
        },
        price: 405580
      }
    });
    
    if (!nutanPurchase) {
      console.log('❌ Nutan Travels purchase not found');
      return;
    }
    
    console.log(`✅ Found purchase: ${nutanPurchase.id} - ${nutanPurchase.description} - ₹${nutanPurchase.price}`);
    
    // Check if it already has items
    const existingItems = await prisma.purchaseItem.findMany({
      where: {
        purchaseDetailId: nutanPurchase.id
      }
    });
    
    if (existingItems.length > 0) {
      console.log(`ℹ️ Purchase already has ${existingItems.length} items`);
      return;
    }
    
    // Create a default item for the Nutan Travels purchase
    await prisma.purchaseItem.create({
      data: {
        purchaseDetailId: nutanPurchase.id,
        productName: nutanPurchase.description || "Air Tickets",
        description: "AMD-SXR 28 MAY || PNR : F1VBRG || SXR-AMD 05 JUNE || PNR : U164KZ ||",
        quantity: 1,
        pricePerUnit: nutanPurchase.price,
        totalAmount: nutanPurchase.price,
        taxAmount: nutanPurchase.gstAmount || null,
        taxSlabId: null,
        unitOfMeasureId: null
      }
    });
    
    console.log('🎉 Successfully created item for Nutan Travels purchase');
    
  } catch (error) {
    console.error('❌ Error fixing Nutan Travels purchase:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixNutanTravelsPurchase()
  .then(() => console.log('🏁 Script completed'))
  .catch(console.error);
