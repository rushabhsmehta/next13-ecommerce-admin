import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 401 });

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });
    return NextResponse.json(travelUser);
  } catch (error) {
    console.log("[TRAVEL_AUTH_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 401 });

    const { name, phone } = await req.json();
    if (!name?.trim()) return new NextResponse("Name is required", { status: 400 });

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return new NextResponse("No email on Clerk account", { status: 400 });

    const travelUser = await prismadb.travelAppUser.upsert({
      where: { clerkUserId: userId },
      create: {
        name: name.trim(),
        email,
        phone: phone?.trim() ?? null,
        clerkUserId: userId,
      },
      update: {
        name: name.trim(),
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
      },
    });
    return NextResponse.json(travelUser, { status: 201 });
  } catch (error) {
    console.log("[TRAVEL_AUTH_PROFILE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
