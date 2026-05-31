import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const TOKEN =
  process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim() || "mobile-dev-test-bypass-20260522";
const KERALA = "032c6a4b-27e3-40a4-94d2-860f91ef69a7";
const SOUTH = "026bd4f4-1d7b-4878-862d-8ca0ecdd35fa";

async function api(path, opts = {}) {
  const res = await fetch(`http://127.0.0.1:3000${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const keralaVariants = await prisma.packageVariant.findMany({
  where: { tourPackageId: KERALA },
  take: 2,
});
const pkg = await api(`/api/mobile/tour-packages/${KERALA}`);
const ot = await prisma.occupancyType.findFirst();
const rt = await prisma.roomType.findFirst();
const mp = await prisma.mealPlan.findFirst();
const loc = await prisma.location.findFirst();

const inquiry = await prisma.inquiry.create({
  data: {
    customerName: "ADB-LIKE",
    customerMobileNumber: "9000000004",
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
      mealPlanId: mp?.id,
      quantity: "2",
    },
  ],
}));

const payload = {
  tourPackageQueryName: "ADB TOUR QUERY TEST – Query",
  customerName: "ADB TOUR QUERY TEST",
  customerNumber: "9876543210",
  numAdults: "2",
  numChild5to12: "0",
  numChild0to5: "0",
  tourStartsFrom: null,
  tourEndsOn: null,
  remarks: null,
  selectedTemplateId: SOUTH,
  selectedTemplateType: "TourPackageVariant",
  tourPackageTemplateName: "South India",
  selectedVariantIds: keralaVariants.map((v) => v.id),
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

console.log("PATCH", patchRes.status, JSON.stringify(patchRes.json, null, 2));

await prisma.tourPackageQuery.delete({ where: { id: queryId } });
await prisma.inquiry.delete({ where: { id: inquiry.id } });
await prisma.$disconnect();

if (patchRes.status !== 200) process.exit(1);
