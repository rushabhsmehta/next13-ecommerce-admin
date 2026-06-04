import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

type ResourceType =
  | "hotels"
  | "locations"
  | "destinations"
  | "suppliers"
  | "itineraries"
  | "vehicle-types";

const ALLOWED: ResourceType[] = [
  "hotels",
  "locations",
  "destinations",
  "suppliers",
  "itineraries",
  "vehicle-types",
];

interface MobileOpsItem {
  id: string;
  name: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string | null;
}

/**
 * Unified read-only list endpoint for operations master data.
 * `?type=hotels|locations|destinations|suppliers|itineraries|vehicle-types`
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "hotels").toLowerCase() as ResourceType;
    if (!ALLOWED.includes(type)) {
      return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
    }
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId") ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    let items: MobileOpsItem[] = [];
    let total = 0;

    if (type === "hotels") {
      const where: Record<string, unknown> = {};
      if (locationId) where.locationId = locationId;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { location: { label: { contains: search } } },
        ];
      }
      const [rows, count] = await Promise.all([
        prismadb.hotel.findMany({
          where,
          select: {
            id: true,
            name: true,
            link: true,
            images: { select: { url: true }, take: 1 },
            location: { select: { id: true, label: true } },
            destination: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
          skip: offset,
          take: limit,
        }),
        prismadb.hotel.count({ where }),
      ]);
      items = rows.map((h) => ({
        id: h.id,
        name: h.name,
        subtitle: h.location?.label ?? undefined,
        meta: h.destination?.name ?? undefined,
        imageUrl: h.images?.[0]?.url ?? null,
      }));
      total = count;
    } else if (type === "locations") {
      const where: Record<string, unknown> = {};
      if (search) where.label = { contains: search };
      const [rows, count] = await Promise.all([
        prismadb.location.findMany({
          where,
          select: {
            id: true,
            label: true,
            imageUrl: true,
            slug: true,
            _count: { select: { hotels: true, tourDestinations: true } },
          },
          orderBy: { label: "asc" },
          skip: offset,
          take: limit,
        }),
        prismadb.location.count({ where }),
      ]);
      items = rows.map((l) => ({
        id: l.id,
        name: l.label,
        subtitle: l.slug ?? undefined,
        meta: `${l._count.hotels} hotels · ${l._count.tourDestinations} destinations`,
        imageUrl: l.imageUrl ?? null,
      }));
      total = count;
    } else if (type === "destinations") {
      const where: Record<string, unknown> = { isActive: true };
      if (locationId) where.locationId = locationId;
      if (search) where.name = { contains: search };
      const [rows, count] = await Promise.all([
        prismadb.tourDestination.findMany({
          where,
          select: {
            id: true,
            name: true,
            imageUrl: true,
            location: { select: { id: true, label: true } },
            _count: { select: { hotels: true } },
          },
          orderBy: { name: "asc" },
          skip: offset,
          take: limit,
        }),
        prismadb.tourDestination.count({ where }),
      ]);
      items = rows.map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.location?.label ?? undefined,
        meta: `${d._count.hotels} hotels`,
        imageUrl: d.imageUrl ?? null,
      }));
      total = count;
    } else if (type === "suppliers") {
      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { contact: { contains: search } },
        ];
      }
      const [rows, count] = await Promise.all([
        prismadb.supplier.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
            gstNumber: true,
            panNumber: true,
            tdsApplicable: true,
          },
          orderBy: { name: "asc" },
          skip: offset,
          take: limit,
        }),
        prismadb.supplier.count({ where }),
      ]);
      items = rows.map((s) => ({
        id: s.id,
        name: s.name,
        subtitle: s.email ?? s.contact ?? undefined,
        meta: [
          s.gstNumber ? `GST: ${s.gstNumber}` : null,
          s.tdsApplicable ? "TDS" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }));
      total = count;
    } else if (type === "itineraries") {
      const where: Record<string, unknown> = {};
      if (locationId) where.locationId = locationId;
      if (search) {
        where.OR = [
          { itineraryMasterTitle: { contains: search } },
          { itineraryMasterDescription: { contains: search } },
        ];
      }
      const [rows, count] = await Promise.all([
        prismadb.itineraryMaster.findMany({
          where,
          select: {
            id: true,
            itineraryMasterTitle: true,
            days: true,
            dayNumber: true,
            mealsIncluded: true,
            location: { select: { id: true, label: true } },
            hotel: { select: { id: true, name: true } },
            itineraryMasterImages: { select: { url: true }, take: 1, orderBy: { createdAt: "asc" } },
          },
          orderBy: { updatedAt: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.itineraryMaster.count({ where }),
      ]);
      items = rows.map((it) => ({
        id: it.id,
        name: it.itineraryMasterTitle ?? "Untitled itinerary",
        subtitle: it.location?.label ?? undefined,
        meta: [
          it.dayNumber ? `Day ${it.dayNumber}` : it.days ? `${it.days}` : null,
          it.hotel?.name,
          it.mealsIncluded,
        ]
          .filter(Boolean)
          .join(" · "),
        imageUrl: it.itineraryMasterImages?.[0]?.url ?? null,
      }));
      total = count;
    } else if (type === "vehicle-types") {
      const where: Record<string, unknown> = { isActive: true };
      if (search) where.name = { contains: search };
      const [rows, count] = await Promise.all([
        prismadb.vehicleType.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: { name: "asc" },
          skip: offset,
          take: limit,
        }),
        prismadb.vehicleType.count({ where }),
      ]);
      items = rows.map((v) => ({
        id: v.id,
        name: v.name,
        subtitle: v.description ?? undefined,
      }));
      total = count;
    }

    return NextResponse.json({
      type,
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPERATIONS_LIST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
