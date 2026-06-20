import prismadb from "@/lib/prismadb";
import {
  parsePolicyField,
  parsePricingSection,
  type PolicyFieldKey,
} from "@/app/api/mobile/tour-packages/policy-fields";

const POLICY_KEYS: PolicyFieldKey[] = [
  "inclusions",
  "exclusions",
  "importantNotes",
  "paymentPolicy",
  "usefulTip",
  "cancellationPolicy",
  "airlineCancellationPolicy",
  "termsconditions",
  "kitchenGroupPolicy",
];

export async function loadTourPackagePrefillFromQuery(queryId: string) {
  const query = await prismadb.tourPackageQuery.findUnique({
      where: { id: queryId },
      include: {
        location: { select: { id: true, label: true } },
        images: { select: { url: true }, orderBy: { createdAt: "asc" } },
        itineraries: {
          include: {
            itineraryImages: { select: { url: true }, orderBy: { createdAt: "asc" } },
            activities: {
              include: {
                activityImages: { select: { url: true }, orderBy: { createdAt: "asc" } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
        },
      },
    });

  if (!query) {
    throw new Error("Tour package query not found");
  }

  const policies = Object.fromEntries(
    POLICY_KEYS.map((key) => [key, parsePolicyField((query as any)[key])])
  ) as Record<PolicyFieldKey, string[]>;

  const pricingSection = parsePricingSection(query.pricingSection);

  return {
    sourceQueryId: query.id,
    sourceQueryName: query.tourPackageQueryName,
    sourceQueryNumber: query.tourPackageQueryNumber,
    locationId: query.locationId,
    locationLabel: query.location.label,
    tourPackageName: query.tourPackageQueryName || query.tourPackageQueryNumber || "Tour package",
    tourPackageType: query.tourPackageQueryType || "Standard",
    tourCategory: query.tourCategory || "Domestic",
    numDaysNight: query.numDaysNight || "",
    transport: query.transport || "",
    pickup_location: query.pickup_location || "",
    drop_location: query.drop_location || "",
    price: query.totalPrice || query.price || "",
    images: (query.images ?? []).map((img) => ({ url: img.url })),
    pricingSection,
    ...policies,
    itineraries: (query.itineraries ?? []).map((itinerary, index) => ({
      dayNumber: itinerary.dayNumber ?? index + 1,
      itineraryTitle: itinerary.itineraryTitle || `Day ${index + 1}`,
      itineraryDescription: itinerary.itineraryDescription || "",
      mealsIncluded: itinerary.mealsIncluded || "",
    })),
  };
}

export type TourPackageFromQueryPrefill = Awaited<
  ReturnType<typeof loadTourPackagePrefillFromQuery>
>;
