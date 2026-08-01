import prismadb from "@/lib/prismadb";
import {
  parsePolicyField,
  type PolicyFieldKey,
} from "@/app/api/mobile/tour-packages/policy-fields";
import { resolveQueryQuoteTotal } from "@/lib/resolve-query-quote-total";

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

  const quote = resolveQueryQuoteTotal({
    confirmedVariantId: query.confirmedVariantId,
    variantPricingData: query.variantPricingData,
  });
  const pricingSection = quote.lineItems.map((item) => ({
    name: item.name,
    price: item.price,
    description: item.description ?? "",
  }));

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
    price: quote.totalDisplay || "",
    images: (query.images ?? []).map((img) => ({ url: img.url })),
    pricingSection,
    ...policies,
    itineraries: (query.itineraries ?? []).map((itinerary, index) => ({
      dayNumber: itinerary.dayNumber ?? index + 1,
      itineraryTitle: itinerary.itineraryTitle || `Day ${index + 1}`,
      itineraryDescription: itinerary.itineraryDescription || "",
      notes: itinerary.notes || "",
      mealsIncluded: itinerary.mealsIncluded || "",
    })),
  };
}

export type TourPackageFromQueryPrefill = Awaited<
  ReturnType<typeof loadTourPackagePrefillFromQuery>
>;
