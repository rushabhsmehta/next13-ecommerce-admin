/**
 * Reproduce mobile save after template pick (first package in list + 2 variants).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
const TOKEN =
  process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim() || "mobile-dev-test-bypass-20260522";

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 800) };
  }
  return { status: res.status, json };
}

async function main() {
  const list = await api("/api/mobile/tour-packages");
  const first = list.json?.packages?.[0];
  if (!first?.id) throw new Error("No packages in mobile list");

  const pkg = await api(`/api/mobile/tour-packages/${encodeURIComponent(first.id)}`);
  if (pkg.status !== 200) throw new Error(`Package detail ${pkg.status}`);

  const variants = pkg.json.variants || [];
  if (variants.length < 2) throw new Error(`Package ${first.id} has <2 variants`);

  const ot = await prisma.occupancyType.findFirst();
  const rt = await prisma.roomType.findFirst();
  const mp = await prisma.mealPlan.findFirst();
  const loc = await prisma.location.findFirst();

  const inquiry = await prisma.inquiry.create({
    data: {
      customerName: "PATCH-FULL-SMOKE",
      customerMobileNumber: "9000000002",
      locationId: loc.id,
      numAdults: 2,
      status: "PENDING",
      roomAllocations: {
        create: [
          {
            quantity: 2,
            roomTypeId: rt.id,
            occupancyTypeId: ot.id,
            mealPlanId: mp?.id,
            customRoomType: "Deluxe",
          },
        ],
      },
    },
  });

  const createRes = await api("/api/mobile/tour-queries", {
    method: "POST",
    body: JSON.stringify({ mode: "inquiry", sourceId: inquiry.id }),
  });
  const queryId = createRes.json.id;

  const itineraries = (pkg.json.itineraries || []).map((it, idx) => ({
    id: `temp-${idx}`,
    dayNumber: it.dayNumber,
    days: String(it.dayNumber ?? idx + 1),
    locationId: pkg.json.locationId || loc.id,
    hotelId: null,
    itineraryTitle: it.itineraryTitle || "",
    itineraryDescription: it.itineraryDescription || "",
    mealsIncluded: it.mealsIncluded || "",
    roomAllocations: [
      {
        roomTypeId: rt.id,
        occupancyTypeId: ot.id,
        mealPlanId: mp?.id ?? null,
        quantity: "2",
        customRoomType: null,
      },
    ],
  }));

  const payload = {
    tourPackageQueryName: "Mobile-like save",
    customerName: "PATCH-FULL-SMOKE",
    customerNumber: "9000000002",
    numAdults: "2",
    numChild5to12: "0",
    numChild0to5: "0",
    tourStartsFrom: null,
    tourEndsOn: null,
    remarks: null,
    selectedTemplateId: first.id,
    selectedTemplateType: "TourPackageVariant",
    tourPackageTemplateName: first.tourPackageName || "Package",
    selectedVariantIds: variants.slice(0, 2).map((v) => v.id),
    itineraries,
    inclusions: [],
    exclusions: [],
    importantNotes: [],
    paymentPolicy: [],
    usefulTip: [],
    cancellationPolicy: [],
    airlineCancellationPolicy: [],
    termsconditions: [],
    kitchenGroupPolicy: [],
  };

  const patchRes = await api(`/api/mobile/tour-queries/${queryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  console.log("Package:", first.tourPackageName);
  console.log("Itinerary days:", itineraries.length);
  console.log("PATCH:", patchRes.status, JSON.stringify(patchRes.json, null, 2));

  await prisma.tourPackageQuery.deleteMany({ where: { id: queryId } });
  await prisma.inquiry.delete({ where: { id: inquiry.id } });
  await prisma.$disconnect();

  if (patchRes.status !== 200) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
