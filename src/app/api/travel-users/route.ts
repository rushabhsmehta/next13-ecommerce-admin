import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/travel-users - List all travel app users (admin only)
export async function GET() {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const role = await getUserOrgRole(userId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: admin access required", 403);
    }

    const users = await prismadb.travelAppUser.findMany({
      include: {
        _count: {
          select: {
            chatMemberships: { where: { isActive: true } },
            chatMessages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  });
}

// POST /api/travel-users - Create a new travel app user (admin only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const role = await getUserOrgRole(userId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: admin access required", 403);
    }

    const body = await req.json();
    const { name, email, phone, clerkUserId, isApproved = false } = body;

    if (!name || !email) {
      return jsonError("Name and email are required", 400);
    }

    // Check for duplicate email
    const existing = await prismadb.travelAppUser.findUnique({
      where: { email },
    });

    if (existing) {
      return jsonError("A user with this email already exists", 409);
    }

    const user = await prismadb.travelAppUser.create({
      data: {
        name,
        email,
        phone,
        clerkUserId,
        isApproved,
      },
    });

    return NextResponse.json(user, { status: 201 });
  });
}
