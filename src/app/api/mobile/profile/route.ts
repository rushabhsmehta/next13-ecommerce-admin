import { NextResponse } from "next/server";
import { verifyToken } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

async function getVerifiedUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization");
  const jwt = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!jwt) return null;
  try {
    const payload = await verifyToken(jwt, { secretKey: process.env.CLERK_SECRET_KEY! });
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getVerifiedUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true, email: true, phone: true, isApproved: true, createdAt: true },
    });
    if (!travelUser) return new NextResponse("User not found", { status: 404 });

    return NextResponse.json(travelUser);
  } catch (error) {
    console.log("[MOBILE_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getVerifiedUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { name, phone } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const travelUser = await prismadb.travelAppUser.update({
      where: { clerkUserId: userId },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(travelUser);
  } catch (error) {
    console.log("[MOBILE_PROFILE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
