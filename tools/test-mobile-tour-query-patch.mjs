/**
 * Smoke test PATCH /api/mobile/tour-queries/[id] with mobile-like payload.
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
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function main() {
  const ot = await prisma.occupancyType.findFirst();
  const rt = await prisma.roomType.findFirst();
  const mp = await prisma.mealPlan.findFirst();
  const loc = await prisma.location.findFirst();
  if (!ot || !rt || !loc) throw new Error("Missing seed data (location/room/occupancy)");

  const pkg = await prisma.tourPackage.findFirst({
    where: { packageVariants: { some: {} } },
    include: { packageVariants: { take: 2 } },
  });
  if (!pkg || pkg.packageVariants.length < 2) {
    throw new Error("Need a tour package with 2+ variants");
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      customerName: "PATCH-SMOKE-TEST",
      customerMobileNumber: "9000000001",
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
            customRoomType: "Test",
          },
        ],
      },
    },
  });

  const createRes = await api("/api/mobile/tour-queries", {
    method: "POST",
    body: JSON.stringify({ mode: "inquiry", sourceId: inquiry.id }),
  });
  if (createRes.status !== 200 && createRes.status !== 201) {
    throw new Error(`Create failed: ${createRes.status} ${JSON.stringify(createRes.json)}`);
  }
  const queryId = createRes.json.id;

  const payload = {
    tourPackageQueryName: "PATCH smoke",
    selectedTemplateId: pkg.id,
    selectedTemplateType: "TourPackageVariant",
    tourPackageTemplateName: pkg.tourPackageName,
    selectedVariantIds: pkg.packageVariants.map((v) => v.id),
    itineraries: [
      {
        dayNumber: "1",
        days: 1,
        locationId: loc.id,
        hotelId: null,
        itineraryTitle: "Day 1",
        itineraryDescription: "",
        mealsIncluded: "",
        roomAllocations: [
          {
            roomTypeId: rt.id,
            occupancyTypeId: ot.id,
            mealPlanId: mp?.id ?? null,
            quantity: "2",
            customRoomType: null,
          },
        ],
      },
    ],
    inclusions: ["A"],
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

  console.log("PATCH status:", patchRes.status);
  console.log("PATCH body:", JSON.stringify(patchRes.json, null, 2));

  const after = await prisma.tourPackageQuery.findUnique({
    where: { id: queryId },
    select: {
      selectedVariantIds: true,
      queryVariantSnapshots: { select: { id: true, name: true } },
    },
  });
  console.log("DB snapshots:", after?.queryVariantSnapshots?.length ?? 0);

  await prisma.tourPackageQuery.deleteMany({ where: { id: queryId } });
  await prisma.inquiry.delete({ where: { id: inquiry.id } });
  await prisma.$disconnect();

  if (patchRes.status !== 200) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
