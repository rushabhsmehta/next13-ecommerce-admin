import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

import prismadb from "@/lib/prismadb";
import { normalizeTourPackageSlugInput } from "@/lib/location-slug";

type TransactionClient = Prisma.TransactionClient;

const toNullableDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

/** Coerce empty / whitespace hotel IDs to null so Prisma FK writes don't fail or clear silently. */
const normalizeHotelId = (hotelId: unknown): string | null => {
  if (typeof hotelId !== "string") {
    return null;
  }
  const trimmed = hotelId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const numericDayFromValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && String(parsed) === value.trim() ? parsed : null;
  }
  return null;
};

export async function GET(req: Request, props: { params: Promise<{ tourPackageId: string }> }) {
  const params = await props.params;
  try {
    if (!params.tourPackageId) {
      return new NextResponse("Tour Package  id is required", { status: 400 });
    }

    const tourPackage = await prismadb.tourPackage.findUnique({
      where: {
        id: params.tourPackageId
      },
      include: {
        flightDetails: true,
        images: true,
        location: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          }, orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ],
        },
        packageVariants: {
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: true
                  }
                },
                itinerary: true
              }
            },
            tourPackagePricings: {
              include: {
                mealPlan: true,
                vehicleType: true,
                locationSeasonalPeriod: true,
                pricingComponents: {
                  include: {
                    pricingAttribute: true
                  },
                  orderBy: {
                    pricingAttribute: {
                      sortOrder: 'asc'
                    }
                  }
                }
              },
              orderBy: {
                startDate: 'asc'
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
    },)
    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOUR_PACKAGE__GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(req: Request, props: { params: Promise<{ tourPackageId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package  Id is required", { status: 400 });
    }

    const tourPackage = await prismadb.tourPackage.delete({
      where: {
        id: params.tourPackageId
      },
    });

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOURPACKAGE__DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

async function createItineraryAndActivities(
  tx: TransactionClient,
  itinerary: {
    itineraryTitle: any;
    itineraryDescription: any;
    locationId: any;
    tourPackageQueryId: any;
    dayNumber: any;
    days: any;
    hotelId: any;
    numberofRooms: any;
    roomCategory: any;
    mealsIncluded: any;
    itineraryImages: any[];
    activities: any[];
  },
  tourPackageId: string,
) {
  const hotelId = normalizeHotelId(itinerary.hotelId);

  const createdItinerary = await tx.itinerary.create({
    data: {
      itineraryTitle: itinerary.itineraryTitle,
      itineraryDescription: itinerary.itineraryDescription,
      locationId: itinerary.locationId,
      tourPackageId,
      tourPackageQueryId: itinerary.tourPackageQueryId,
      dayNumber: itinerary.dayNumber,
      days: itinerary.days,
      hotelId,
      numberofRooms: itinerary.numberofRooms,
      roomCategory: itinerary.roomCategory,
      mealsIncluded: itinerary.mealsIncluded,
      itineraryImages: Array.isArray(itinerary.itineraryImages) && itinerary.itineraryImages.length > 0
        ? {
          createMany: {
            data: itinerary.itineraryImages
              .filter((image: { url?: string }) => Boolean(image?.url))
              .map((image: { url: string }) => ({ url: image.url })),
          },
        }
        : undefined,
    },
  });

  if (itinerary.activities && itinerary.activities.length > 0) {
    await Promise.all(itinerary.activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
      return tx.activity.create({
        data: {
          itineraryId: createdItinerary.id,
          activityTitle: activity.activityTitle,
          activityDescription: activity.activityDescription,
          locationId: activity.locationId,
          activityImages: Array.isArray(activity.activityImages) && activity.activityImages.length > 0
            ? {
              createMany: {
                data: activity.activityImages
                  .filter((img: { url?: string }) => Boolean(img?.url))
                  .map((img: { url: string }) => ({ url: img.url })),
              },
            }
            : undefined,
        },
      });
    }));
  }

  return createdItinerary;
}

export async function PATCH(req: Request, props: { params: Promise<{ tourPackageId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    const body = await req.json();

    const {
      tourPackageName,
      tourPackageType,
      numDaysNight,
      transport,
      pickup_location,
      drop_location,
      price,
      pricePerAdult,
      pricePerChildOrExtraBed,
      pricePerChild5to12YearsNoBed,
      pricePerChildwithSeatBelow5Years,
      pricingSection,
      flightDetails,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip, cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      kitchenGroupPolicy,
      locationId,
      images,
      itineraries,
      isFeatured,
      isArchived,
      isOffer,
      offerTitle,
      offerSubtitle,
      offerBadge,
      offerPrice,
      offerOriginalPrice,
      offerStartsAt,
      offerEndsAt,
      offerSortOrder,
      offerTerms,
      slug,
      packageVariants,
    } = body;

    console.log(flightDetails);

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

    const processedInclusions = Array.isArray(inclusions) ? inclusions : inclusions ? [inclusions] : [];
    const processedExclusions = Array.isArray(exclusions) ? exclusions : exclusions ? [exclusions] : [];
    const processedImportantNotes = Array.isArray(importantNotes) ? importantNotes : importantNotes ? [importantNotes] : [];
    const processedPaymentPolicy = Array.isArray(paymentPolicy) ? paymentPolicy : paymentPolicy ? [paymentPolicy] : [];
    const processedUsefulTip = Array.isArray(usefulTip) ? usefulTip : usefulTip ? [usefulTip] : [];
    const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? cancellationPolicy : cancellationPolicy ? [cancellationPolicy] : [];
    const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? airlineCancellationPolicy : airlineCancellationPolicy ? [airlineCancellationPolicy] : [];
    const processedTermsConditions = Array.isArray(termsconditions) ? termsconditions : termsconditions ? [termsconditions] : [];
    const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? kitchenGroupPolicy : kitchenGroupPolicy ? [kitchenGroupPolicy] : [];

    const inclusionsString = JSON.stringify(processedInclusions);
    const exclusionsString = JSON.stringify(processedExclusions);
    const importantNotesString = JSON.stringify(processedImportantNotes);
    const paymentPolicyString = JSON.stringify(processedPaymentPolicy);
    const usefulTipString = JSON.stringify(processedUsefulTip);
    const cancellationPolicyString = JSON.stringify(processedCancellationPolicy);
    const airlineCancellationPolicyString = JSON.stringify(processedAirlineCancellationPolicy);
    const termsConditionsString = JSON.stringify(processedTermsConditions);
    const kitchenGroupPolicyString = JSON.stringify(processedKitchenGroupPolicy);
    const normalizedSlug = normalizeTourPackageSlugInput(slug, tourPackageName);

    // Capture ALL old itinerary id→day mappings BEFORE deletion (for variant hotel remapping)
    const oldItineraryIdToDayMap = new Map<string, number>();
    const oldItineraries = await prismadb.itinerary.findMany({
      where: { tourPackageId: params.tourPackageId },
      select: { id: true, dayNumber: true },
    });
    oldItineraries.forEach((itin) => {
      if (itin.dayNumber != null) {
        oldItineraryIdToDayMap.set(itin.id, itin.dayNumber);
      }
    });
    // Also accept day numbers from the submitted payload (form preserves itinerary.id + dayNumber)
    if (Array.isArray(itineraries)) {
      itineraries.forEach((itin: any, index: number) => {
        if (itin?.id && typeof itin.id === "string") {
          const day = numericDayFromValue(itin.dayNumber) ?? index + 1;
          if (!oldItineraryIdToDayMap.has(itin.id)) {
            oldItineraryIdToDayMap.set(itin.id, day);
          }
        }
      });
    }
    console.log(`[VARIANTS PRE] Built old ID-to-day map with ${oldItineraryIdToDayMap.size} entries`);

    // Load existing variants once — used when the client omits variants or sends
    // empty hotelMappings (common after Variants tab default init), so itinerary
    // delete→cascade does not permanently wipe hotel assignments.
    const existingVariantsForFallback = await prismadb.packageVariant.findMany({
      where: { tourPackageId: params.tourPackageId },
      include: {
        variantHotelMappings: {
          select: { itineraryId: true, hotelId: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const dbVariantHotelMappingsById = new Map<string, Record<string, string>>();
    for (const variant of existingVariantsForFallback) {
      dbVariantHotelMappingsById.set(
        variant.id,
        Object.fromEntries(
          variant.variantHotelMappings
            .filter((m) => m.itineraryId && m.hotelId)
            .map((m) => [m.itineraryId, m.hotelId])
        )
      );
    }

    const toClientVariantShape = (variant: (typeof existingVariantsForFallback)[number]) => ({
      id: variant.id,
      name: variant.name,
      description: variant.description,
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder,
      priceModifier: variant.priceModifier,
      hotelMappings: dbVariantHotelMappingsById.get(variant.id) ?? {},
    });

    let effectivePackageVariants = Array.isArray(packageVariants) ? [...packageVariants] : [];
    const totalDbHotelMappings = [...dbVariantHotelMappingsById.values()].reduce(
      (sum, mappings) => sum + Object.keys(mappings).length,
      0
    );
    const totalSubmittedHotelMappings = effectivePackageVariants.reduce((sum, variant: any) => {
      const mappings =
        variant?.hotelMappings && typeof variant.hotelMappings === 'object'
          ? variant.hotelMappings
          : {};
      return (
        sum +
        Object.values(mappings).filter((id) => typeof id === 'string' && id.trim().length > 0).length
      );
    }, 0);

    if (effectivePackageVariants.length === 0 && existingVariantsForFallback.length > 0) {
      effectivePackageVariants = existingVariantsForFallback.map(toClientVariantShape);
      console.log(
        `[VARIANTS PRE] Client sent no variants — restored ${effectivePackageVariants.length} from DB`
      );
    } else if (
      totalSubmittedHotelMappings === 0 &&
      totalDbHotelMappings > 0 &&
      existingVariantsForFallback.length > 0
    ) {
      // Form/Variants tab often submits a default "Standard" with empty mappings;
      // prefer DB so wipe-and-recreate does not drop hotels.
      effectivePackageVariants = existingVariantsForFallback.map(toClientVariantShape);
      console.log(
        `[VARIANTS PRE] Client sent 0 hotel mappings but DB has ${totalDbHotelMappings} — restored variants from DB`
      );
    } else if (effectivePackageVariants.length > 0) {
      // Fill empty hotelMappings from DB for existing variant ids only
      effectivePackageVariants = effectivePackageVariants.map((variant: any) => {
        const submittedMappings =
          variant.hotelMappings && typeof variant.hotelMappings === 'object'
            ? variant.hotelMappings
            : {};
        const submittedCount = Object.values(submittedMappings).filter(
          (id) => typeof id === 'string' && id.trim().length > 0
        ).length;
        if (submittedCount > 0 || typeof variant.id !== 'string') {
          return variant;
        }
        const dbMappings = dbVariantHotelMappingsById.get(variant.id);
        if (!dbMappings || Object.keys(dbMappings).length === 0) {
          return variant;
        }
        console.log(
          `[VARIANTS PRE] Restored ${Object.keys(dbMappings).length} hotel mappings for variant ${variant.id} from DB`
        );
        return { ...variant, hotelMappings: dbMappings };
      });
    }

    // Preserve variant seasonal pricing before package variants are recreated.
    const existingVariantPricingById = new Map<string, any[]>();

    if (effectivePackageVariants.length > 0) {
      const existingVariantIds = effectivePackageVariants
        .map((variant: any) => variant?.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

      if (existingVariantIds.length > 0) {
        const existingVariantPricings = await prismadb.tourPackagePricing.findMany({
          where: {
            tourPackageId: params.tourPackageId,
            packageVariantId: { in: existingVariantIds },
          },
          include: {
            pricingComponents: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        });

        existingVariantPricings.forEach((pricing) => {
          if (!pricing.packageVariantId) {
            return;
          }

          const entries = existingVariantPricingById.get(pricing.packageVariantId) ?? [];
          entries.push(pricing);
          existingVariantPricingById.set(pricing.packageVariantId, entries);
        });

        console.log(`[VARIANTS PRE] Snapshotted ${existingVariantPricings.length} seasonal pricing records for ${existingVariantPricingById.size} variants`);
      }
    }

    // Main package fields only — itineraries deleted/recreated inside the transaction
    const tourPackageUpdateData = {
      tourPackageName,
      tourPackageType,
      numDaysNight,
      locationId,
      transport,
      pickup_location,
      drop_location,
      inclusions: inclusionsString,
      exclusions: exclusionsString,
      importantNotes: importantNotesString,
      paymentPolicy: paymentPolicyString,
      usefulTip: usefulTipString,
      cancellationPolicy: cancellationPolicyString,
      airlineCancellationPolicy: airlineCancellationPolicyString,
      termsconditions: termsConditionsString,
      kitchenGroupPolicy: kitchenGroupPolicyString,
      price,
      pricePerAdult,
      pricePerChildOrExtraBed,
      pricePerChild5to12YearsNoBed,
      pricePerChildwithSeatBelow5Years,
      pricingSection,
      isFeatured,
      isArchived,
      isOffer: Boolean(isOffer),
      offerTitle: offerTitle?.trim?.() || null,
      offerSubtitle: offerSubtitle?.trim?.() || null,
      offerBadge: offerBadge?.trim?.() || null,
      offerPrice: offerPrice?.trim?.() || null,
      offerOriginalPrice: offerOriginalPrice?.trim?.() || null,
      offerStartsAt: toNullableDate(offerStartsAt),
      offerEndsAt: toNullableDate(offerEndsAt),
      offerSortOrder: Number.isFinite(Number(offerSortOrder)) ? Number(offerSortOrder) : 0,
      offerTerms: Array.isArray(offerTerms) ? offerTerms.filter(Boolean) : null,
      slug: normalizedSlug,
      images: images && images.length > 0 ? {
        deleteMany: {},
        createMany: {
          data: [
            ...images.map((img: { url: string }) => img),
          ],
        },
      } : { deleteMany: {} },
      flightDetails: {
        deleteMany: {},
        createMany: {
          data: Array.isArray(flightDetails)
            ? flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail)
            : [],
        }
      }
    };

    await prismadb.$transaction(async (tx) => {
      await tx.tourPackage.update({
        where: { id: params.tourPackageId },
        data: tourPackageUpdateData as any,
      });

      // Delete existing itineraries (cascades VariantHotelMapping) inside the transaction
      await tx.itinerary.deleteMany({
        where: { tourPackageId: params.tourPackageId },
      });
      console.log('[TRANSACTION] Deleted existing itineraries');

      if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
        for (let i = 0; i < itineraries.length; i++) {
          const itinerary = itineraries[i];
          try {
            await createItineraryAndActivities(tx, itinerary, params.tourPackageId);
          } catch (itineraryError: any) {
            console.error('[ITINERARY_CREATION_ERROR]', {
              itineraryIndex: i,
              itineraryTitle: itinerary?.itineraryTitle,
              error: itineraryError,
            });
            throw new Error(
              `Failed to create itinerary ${i + 1} "${itinerary?.itineraryTitle ?? 'unknown'}": ${itineraryError?.message || 'Unknown error'}`
            );
          }
        }
        console.log(`[TRANSACTION] Created ${itineraries.length} itineraries`);
      }

      // Recreate package variants + hotel mappings (errors must abort the transaction)
      if (effectivePackageVariants.length > 0) {
        console.log(`[VARIANTS] Processing ${effectivePackageVariants.length} package variants`);

        const newItineraries = await tx.itinerary.findMany({
          where: { tourPackageId: params.tourPackageId },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ],
          select: { id: true, dayNumber: true }
        });
        console.log(`[VARIANTS] Found ${newItineraries.length} newly created itineraries`);

        const dayToNewIdMap = new Map<number, string>();
        newItineraries.forEach(itin => {
          if (itin.dayNumber != null) {
            dayToNewIdMap.set(itin.dayNumber, itin.id);
          }
        });

        await tx.packageVariant.deleteMany({
          where: { tourPackageId: params.tourPackageId }
        });
        console.log('[VARIANTS] Deleted existing variants');

        for (const variant of effectivePackageVariants) {
          const createdVariant = await tx.packageVariant.create({
            data: {
              name: variant.name,
              description: variant.description || null,
              isDefault: variant.isDefault || false,
              sortOrder: variant.sortOrder || 0,
              priceModifier: variant.priceModifier || 0,
              tourPackageId: params.tourPackageId,
            }
          });

          console.log(`[VARIANTS] Created variant: ${createdVariant.name}`);

          if (variant.hotelMappings && Object.keys(variant.hotelMappings).length > 0) {
            const mappings = Object.entries(variant.hotelMappings)
              .map(([oldItineraryId, hotelId]) => {
                const normalizedHotelId = normalizeHotelId(hotelId);
                if (!normalizedHotelId) {
                  return null;
                }

                let dayNumber = oldItineraryIdToDayMap.get(oldItineraryId);
                if (dayNumber == null) {
                  const parsed = numericDayFromValue(oldItineraryId);
                  if (parsed != null) {
                    dayNumber = parsed;
                    console.log(`[VARIANTS] Key "${oldItineraryId}" treated as day number directly`);
                  } else {
                    console.log(`[VARIANTS] Cannot find dayNumber for old ID: ${oldItineraryId}`);
                    return null;
                  }
                }

                const newItineraryId = dayToNewIdMap.get(dayNumber);
                if (!newItineraryId) {
                  console.log(`[VARIANTS] Cannot find new ID for day ${dayNumber}`);
                  return null;
                }

                console.log(`[VARIANTS] Remapped: ${oldItineraryId} → day ${dayNumber} → ${newItineraryId}`);

                return {
                  packageVariantId: createdVariant.id,
                  itineraryId: newItineraryId,
                  hotelId: normalizedHotelId,
                };
              })
              .filter((m): m is { packageVariantId: string; itineraryId: string; hotelId: string } =>
                m !== null && !!m.hotelId && !!m.itineraryId
              );

            if (mappings.length > 0) {
              await tx.variantHotelMapping.createMany({
                data: mappings,
              });
              console.log(`[VARIANTS] Created ${mappings.length} hotel mappings for variant: ${createdVariant.name}`);
            } else {
              console.log(`[VARIANTS] No valid hotel mappings to create for variant: ${createdVariant.name}`);
            }
          }

          const preservedPricings = variant.id ? existingVariantPricingById.get(variant.id) ?? [] : [];

          if (preservedPricings.length > 0) {
            await Promise.all(
              preservedPricings.map((pricing) =>
                tx.tourPackagePricing.create({
                  data: {
                    tourPackageId: params.tourPackageId,
                    packageVariantId: createdVariant.id,
                    startDate: pricing.startDate,
                    endDate: pricing.endDate,
                    isActive: pricing.isActive,
                    description: pricing.description,
                    mealPlanId: pricing.mealPlanId,
                    numberOfRooms: pricing.numberOfRooms,
                    locationSeasonalPeriodId: pricing.locationSeasonalPeriodId,
                    isGroupPricing: pricing.isGroupPricing,
                    vehicleTypeId: pricing.vehicleTypeId,
                    pricingComponents: pricing.pricingComponents.length > 0
                      ? {
                        create: pricing.pricingComponents.map((component: any) => ({
                          pricingAttributeId: component.pricingAttributeId,
                          price: component.price,
                          purchasePrice: component.purchasePrice,
                          description: component.description,
                        })),
                      }
                      : undefined,
                  },
                })
              )
            );
            console.log(`[VARIANTS] Restored ${preservedPricings.length} seasonal pricing records for variant ${createdVariant.id}`);
          } else if (variant.copiedFromTourPackageId) {
            console.log(`[VARIANTS] Copying seasonal pricing for variant ${createdVariant.id} from package ${variant.copiedFromTourPackageId}`);
            const sourcePricings = await tx.tourPackagePricing.findMany({
              where: {
                tourPackageId: variant.copiedFromTourPackageId,
                packageVariantId: null,
              },
              include: {
                pricingComponents: true,
              },
              orderBy: {
                startDate: 'asc',
              },
            });

            if (sourcePricings.length === 0) {
              console.log(`[VARIANTS] No pricing records found to copy from package ${variant.copiedFromTourPackageId}`);
            } else {
              await Promise.all(
                sourcePricings.map((pricing) =>
                  tx.tourPackagePricing.create({
                    data: {
                      tourPackageId: params.tourPackageId,
                      packageVariantId: createdVariant.id,
                      startDate: pricing.startDate,
                      endDate: pricing.endDate,
                      isActive: pricing.isActive,
                      description: pricing.description,
                      mealPlanId: pricing.mealPlanId,
                      numberOfRooms: pricing.numberOfRooms,
                      locationSeasonalPeriodId: pricing.locationSeasonalPeriodId,
                      isGroupPricing: pricing.isGroupPricing,
                      vehicleTypeId: pricing.vehicleTypeId,
                      pricingComponents: pricing.pricingComponents.length > 0
                        ? {
                          create: pricing.pricingComponents.map((component) => ({
                            pricingAttributeId: component.pricingAttributeId,
                            price: component.price,
                            purchasePrice: component.purchasePrice,
                            description: component.description,
                          })),
                        }
                        : undefined,
                    },
                  })
                )
              );
              console.log(`[VARIANTS] Copied ${sourcePricings.length} seasonal pricing records to variant ${createdVariant.id}`);
            }
          }
        }

        console.log('[VARIANTS] Successfully saved all package variants');
      }
    }, {
      maxWait: 10000,
      timeout: 50000,
    });

    const tourPackage = await prismadb.tourPackage.findUnique({
      where: { id: params.tourPackageId },
      include: {
        location: true,
        flightDetails: true,
        images: true, itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ]
        },
        packageVariants: {
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: true
                  }
                },
                itinerary: true
              },
            },
            tourPackagePricings: {
              include: {
                mealPlan: true,
                vehicleType: true,
                locationSeasonalPeriod: true,
                pricingComponents: {
                  include: {
                    pricingAttribute: true
                  },
                  orderBy: {
                    pricingAttribute: {
                      sortOrder: 'asc'
                    }
                  }
                }
              },
              orderBy: {
                startDate: 'asc'
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return NextResponse.json(tourPackage);
  } catch (error: any) {
    console.log('[TOURPACKAGE_PATCH]', error);
    const message = typeof error?.message === 'string' && error.message.length > 0
      ? error.message
      : "Internal error";
    // Surface itinerary/variant failures so the client does not treat a wiped save as success
    if (message.startsWith('Failed to create itinerary') || message.includes('[VARIANTS]')) {
      return new NextResponse(message, { status: 500 });
    }
    return new NextResponse(message.includes('Failed to') ? message : "Internal error", { status: 500 });
  }
};
