import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { OrganizationRole } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole, requireOrgAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

const roleEnum = z.enum(["OWNER", "ADMIN", "FINANCE", "OPERATIONS", "VIEWER"]);

const postSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  role: roleEnum,
  email: z.union([z.string().email(), z.literal("")]).optional(),
});

function isManagerRole(role: OrganizationRole | string) {
  return role === "OWNER" || role === "ADMIN";
}

async function countOtherActiveManagers(organizationId: string, excludeUserId: string) {
  return prismadb.organizationMember.count({
    where: {
      organizationId,
      isActive: true,
      role: { in: ["OWNER", "ADMIN"] },
      userId: { not: excludeUserId },
    },
  });
}

/** If this change removes the last active OWNER/ADMIN, returns an error response; otherwise null. */
async function guardNotRemovingLastManager(
  organizationId: string,
  targetUserId: string,
  nextRole: OrganizationRole,
  nextActive: boolean
): Promise<NextResponse | null> {
  const nextIsManager = nextActive && isManagerRole(nextRole);
  if (nextIsManager) return null;

  const cur = await prismadb.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
  });
  const wasManager = cur?.isActive && cur.role && isManagerRole(cur.role);
  if (!wasManager) return null;

  const others = await countOtherActiveManagers(organizationId, targetUserId);
  if (others < 1) {
    return jsonError(
      "Cannot remove or demote the last organization owner or admin.",
      400,
      "LAST_MANAGER"
    );
  }
  return null;
}

// GET — list members (ADMIN+)
export async function GET(
  _req: Request,
  props: { params: Promise<{ organizationId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    await requireOrgAdmin(userId, params.organizationId);

    const members = await prismadb.organizationMember.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ members });
  });
}

// POST — upsert member by Clerk userId (ADMIN+; only OWNER may grant OWNER)
export async function POST(
  req: Request,
  props: { params: Promise<{ organizationId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    await requireOrgAdmin(clerkId, params.organizationId);

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      throw new z.ZodError(parsed.error.issues);
    }

    const { userId: targetUserId, role, email } = parsed.data;

    if (role === "OWNER") {
      const requesterRole = await getUserOrgRole(clerkId, params.organizationId);
      if (requesterRole !== "OWNER") {
        return jsonError("Only an owner can assign the OWNER role.", 403, "FORBIDDEN");
      }
    }

    const blocked = await guardNotRemovingLastManager(
      params.organizationId,
      targetUserId,
      role,
      true
    );
    if (blocked) return blocked;

    const member = await prismadb.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: targetUserId,
        },
      },
      create: {
        organizationId: params.organizationId,
        userId: targetUserId,
        role,
        email: email ? email : null,
        isActive: true,
      },
      update: {
        role,
        ...(email !== undefined ? { email: email ? email : null } : {}),
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ member });
  });
}
