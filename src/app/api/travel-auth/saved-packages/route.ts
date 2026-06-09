import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const packageSelect = {
  id: true,
  tourPackageName: true,
  slug: true,
  numDaysNight: true,
  price: true,
  pricePerAdult: true,
  tourCategory: true,
  location: { select: { id: true, label: true, imageUrl: true } },
  images: { select: { url: true }, take: 1 },
  _count: { select: { itineraries: true } },
} as const;

async function requireTravelUser(userId: string) {
  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
  });
  if (!travelUser) {
    throw Object.assign(new Error("Complete your profile first"), { code: "NOT_FOUND" });
  }
  return travelUser;
}

export async function GET() {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 401);

    const travelUser = await requireTravelUser(userId);

    const saved = await prismadb.savedPackage.findMany({
      where: { travelAppUserId: travelUser.id },
      include: { tourPackage: { select: packageSelect } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      items: saved.map((row) => ({
        id: row.id,
        savedAt: row.createdAt.toISOString(),
        tourPackageId: row.tourPackageId,
        package: row.tourPackage,
      })),
    });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 401);

    const { tourPackageId } = await req.json();
    if (!tourPackageId?.trim()) return jsonError("tourPackageId is required", 400);

    const travelUser = await requireTravelUser(userId);

    const tourPackage = await prismadb.tourPackage.findFirst({
      where: { id: tourPackageId, isArchived: false },
      select: { id: true },
    });
    if (!tourPackage) return jsonError("Package not found", 404);

    await prismadb.savedPackage.upsert({
      where: {
        travelAppUserId_tourPackageId: {
          travelAppUserId: travelUser.id,
          tourPackageId: tourPackage.id,
        },
      },
      create: {
        travelAppUserId: travelUser.id,
        tourPackageId: tourPackage.id,
      },
      update: {},
    });

    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 401);

    const tourPackageId =
      new URL(req.url).searchParams.get("tourPackageId") ||
      (await req.json().catch(() => ({}))).tourPackageId;

    if (!tourPackageId?.trim()) return jsonError("tourPackageId is required", 400);

    const travelUser = await requireTravelUser(userId);

    await prismadb.savedPackage.deleteMany({
      where: {
        travelAppUserId: travelUser.id,
        tourPackageId: tourPackageId.trim(),
      },
    });

    return NextResponse.json({ ok: true });
  });
}
