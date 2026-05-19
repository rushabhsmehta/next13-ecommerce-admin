import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { claimPendingChatInvitesForTravelUser } from "@/lib/chat-invites";
import {
  verifyMobileBearerUserId,
  isMobileDevBypassRequest,
} from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

async function getVerifiedUserId(req: Request): Promise<string | null> {
  return verifyMobileBearerUserId(req);
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
      select: { id: true, name: true, email: true, phone: true, isApproved: true },
    });

    const acceptedInviteCount = await claimPendingChatInvitesForTravelUser(travelUser.id);
    const refreshed = acceptedInviteCount
      ? await prismadb.travelAppUser.findUnique({
          where: { id: travelUser.id },
          select: { id: true, name: true, email: true, phone: true, isApproved: true },
        })
      : travelUser;

    return NextResponse.json({ ...(refreshed ?? travelUser), acceptedInviteCount });
  } catch (error) {
    console.log("[MOBILE_PROFILE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getVerifiedUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { name, phone } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    let email: string | null = null;
    if (isMobileDevBypassRequest(req)) {
      const raw = body.email;
      if (typeof raw === "string" && raw.includes("@")) {
        email = raw.trim();
      }
      if (!email) {
        return new NextResponse(
          "email is required in body when using dev auth bypass",
          { status: 400 }
        );
      }
    } else {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      if (!email) return new NextResponse("No email on Clerk account", { status: 400 });
    }

    const travelUser = await prismadb.travelAppUser.upsert({
      where: { clerkUserId: userId },
      create: {
        name: name.trim(),
        email,
        phone: phone?.trim() || null,
        clerkUserId: userId,
      },
      update: {
        name: name.trim(),
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, isApproved: true },
    });

    const acceptedInviteCount = await claimPendingChatInvitesForTravelUser(travelUser.id);
    const refreshed = acceptedInviteCount
      ? await prismadb.travelAppUser.findUnique({
          where: { id: travelUser.id },
          select: { id: true, name: true, email: true, phone: true, isApproved: true },
        })
      : travelUser;

    return NextResponse.json({ ...(refreshed ?? travelUser), acceptedInviteCount }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_PROFILE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
