/**
 * Variant Snapshot Utility
 * 
 * Creates and manages variant snapshots for tour package queries.
 * Snapshots preserve variant state (hotels, pricing, etc.) independent of source tour package changes.
 */

import prismadb from '@/lib/prismadb';
import { Decimal } from '@prisma/client/runtime/library';

interface SnapshotOptions {
  overwrite?: boolean; // If true, delete existing snapshots before creating new ones
}

/**
 * Create variant snapshots for a tour package query
 * 
 * @param queryId - TourPackageQuery ID
 * @param variantIds - Array of PackageVariant IDs to snapshot
 * @param options - Snapshot creation options
 */
export async function createVariantSnapshots(
  queryId: string,
  variantIds: string[],
  options: SnapshotOptions = { overwrite: true }
) {
  if (!queryId || !variantIds || variantIds.length === 0) {
    console.log('⚠️ [Snapshot] No variants to snapshot');
    return { success: true, count: 0 };
  }

  console.log(`📸 [Snapshot] Creating snapshots for query ${queryId}, variants: ${variantIds.join(', ')}`);

  try {
    // Delete existing snapshots if overwrite is enabled
    if (options.overwrite) {
      const deleted = await prismadb.queryVariantSnapshot.deleteMany({
        where: { tourPackageQueryId: queryId },
      });
      console.log(`🗑️ [Snapshot] Deleted ${deleted.count} existing snapshots`);
    }

    // Fetch full variant data with all relations
    const variants = await prismadb.packageVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        variantHotelMappings: {
          include: {
            hotel: {
              include: {
                images: {
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
                location: true,
              },
            },
            itinerary: true,
          },
        },
        tourPackagePricings: {
          include: {
            mealPlan: true,
            vehicleType: true,
            pricingComponents: {
              include: {
                pricingAttribute: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (variants.length === 0) {
      console.log('⚠️ [Snapshot] No variants found for provided IDs');
      return { success: true, count: 0 };
    }

    // Create snapshots for each variant
    const snapshotPromises = variants.map(async (variant) => {
      console.log(`📦 [Snapshot] Processing variant: ${variant.name}`);

      // Create variant snapshot
      const variantSnapshot = await prismadb.queryVariantSnapshot.create({
        data: {
          tourPackageQueryId: queryId,
          sourceVariantId: variant.id,
          name: variant.name,
          description: variant.description,
          isDefault: variant.isDefault,
          sortOrder: variant.sortOrder,
          priceModifier: variant.priceModifier,
        },
      });

      // Create hotel mapping snapshots
      const hotelSnapshotPromises = variant.variantHotelMappings.map(async (mapping) => {
        const dayNumber = mapping.itinerary?.dayNumber;
        if (typeof dayNumber !== 'number') {
          console.log(`⚠️ [Snapshot] Skipping hotel mapping - no day number for itinerary ${mapping.itineraryId}`);
          return null;
        }

        return prismadb.queryVariantHotelSnapshot.create({
          data: {
            variantSnapshotId: variantSnapshot.id,
            dayNumber: dayNumber,
            hotelId: mapping.hotelId,
            hotelName: mapping.hotel.name,
            locationLabel: mapping.hotel.location.label,
            imageUrl: mapping.hotel.images[0]?.url || null,
            roomCategory: null, // Room category not stored at hotel level
          },
        });
      });

      const hotelSnapshots = await Promise.all(hotelSnapshotPromises);
      console.log(`🏨 [Snapshot] Created ${hotelSnapshots.filter(Boolean).length} hotel snapshots for ${variant.name}`);

      // Create pricing snapshots
      const pricingSnapshotPromises = variant.tourPackagePricings.map(async (pricing) => {
        // Calculate total price from components
        const totalPrice = pricing.pricingComponents.reduce(
          (sum, component) => sum.add(component.price),
          new Decimal(0)
        );

        const pricingSnapshot = await prismadb.queryVariantPricingSnapshot.create({
          data: {
            variantSnapshotId: variantSnapshot.id,
            startDate: pricing.startDate,
            endDate: pricing.endDate,
            mealPlanId: pricing.mealPlanId,
            mealPlanName: pricing.mealPlan.name,
            numberOfRooms: pricing.numberOfRooms,
            isGroupPricing: pricing.isGroupPricing,
            vehicleTypeId: pricing.vehicleTypeId,
            vehicleTypeName: pricing.vehicleType?.name || null,
            totalPrice: totalPrice,
            description: pricing.description,
          },
        });

        // Create pricing component snapshots
        const componentSnapshotPromises = pricing.pricingComponents.map((component) =>
          prismadb.queryVariantPricingComponentSnapshot.create({
            data: {
              pricingSnapshotId: pricingSnapshot.id,
              pricingAttributeId: component.pricingAttributeId,
              attributeName: component.pricingAttribute.name,
              price: component.price,
              purchasePrice: component.purchasePrice,
              description: component.description,
            },
          })
        );

        await Promise.all(componentSnapshotPromises);
        return pricingSnapshot;
      });

      const pricingSnapshots = await Promise.all(pricingSnapshotPromises);
      console.log(`💰 [Snapshot] Created ${pricingSnapshots.length} pricing snapshots for ${variant.name}`);

      return variantSnapshot;
    });

    const snapshots = await Promise.all(snapshotPromises);
    console.log(`✅ [Snapshot] Successfully created ${snapshots.length} variant snapshots`);

    return { success: true, count: snapshots.length };
  } catch (error) {
    console.error('❌ [Snapshot] Error creating snapshots:', error);
    throw error;
  }
}

/**
 * Get variant snapshots for a tour package query with all relations
 * 
 * @param queryId - TourPackageQuery ID
 */
export async function getVariantSnapshots(queryId: string) {
  return prismadb.queryVariantSnapshot.findMany({
    where: { tourPackageQueryId: queryId },
    include: {
      hotelSnapshots: {
        orderBy: { dayNumber: 'asc' },
      },
      pricingSnapshots: {
        include: {
          pricingComponentSnapshots: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Delete variant snapshots for a tour package query
 * 
 * @param queryId - TourPackageQuery ID
 */
export async function deleteVariantSnapshots(queryId: string) {
  const result = await prismadb.queryVariantSnapshot.deleteMany({
    where: { tourPackageQueryId: queryId },
  });

  console.log(`🗑️ [Snapshot] Deleted ${result.count} snapshots for query ${queryId}`);
  return result;
}

/**
 * Check if a tour package query has variant snapshots
 * 
 * @param queryId - TourPackageQuery ID
 */
export async function hasVariantSnapshots(queryId: string): Promise<boolean> {
  const count = await prismadb.queryVariantSnapshot.count({
    where: { tourPackageQueryId: queryId },
  });

  return count > 0;
}
