import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const TOKEN =
  process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim() || "mobile-dev-test-bypass-20260522";
const KERALA = "032c6a4b-27e3-40a4-94d2-860f91ef69a7";
const SOUTH = "026bd4f4-1d7b-4878-862d-8ca0ecdd35fa";

const variants = await prisma.packageVariant.findMany({
  where: { tourPackageId: KERALA },
  take: 2,
});
const loc = await prisma.location.findFirst();
const inquiry = await prisma.inquiry.create({
  data: {
    customerName: "MISMATCH-TEST",
    customerMobileNumber: "9000000003",
    locationId: loc.id,
    numAdults: 2,
    status: "PENDING",
  },
});

const cr = await fetch("http://127.0.0.1:3000/api/mobile/tour-queries", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ mode: "inquiry", sourceId: inquiry.id }),
});
const { id } = await cr.json();

await prisma.tourPackageQuery.update({
  where: { id },
  data: { selectedTemplateId: SOUTH },
});

const patch = await fetch(`http://127.0.0.1:3000/api/mobile/tour-queries/${id}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    selectedTemplateId: SOUTH,
    selectedVariantIds: variants.map((v) => v.id),
  }),
});

const text = await patch.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}
console.log("PATCH", patch.status, body);

const after = await prisma.tourPackageQuery.findUnique({
  where: { id },
  select: {
    selectedTemplateId: true,
    queryVariantSnapshots: { select: { id: true, name: true } },
  },
});
console.log("DB template:", after?.selectedTemplateId);
console.log("Snapshots:", after?.queryVariantSnapshots?.length);

await prisma.tourPackageQuery.delete({ where: { id } });
await prisma.inquiry.delete({ where: { id: inquiry.id } });
await prisma.$disconnect();

if (patch.status !== 200 || after?.selectedTemplateId !== KERALA) process.exit(1);
