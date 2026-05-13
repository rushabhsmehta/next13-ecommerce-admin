import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { OrganizationRole } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole, requireOrgAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

const roleEnum = z.enum(["OWNER", "ADMIN", "FINANCE", "OPERATIONS", "VIEWER"]);

const patchSchema = z
  .object({
    role: roleEnum.optional(),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((b) => b.role !== undefined || b.email !== undefined || b.isActive !== undefined, {
    message: "At least one of role, email, or isActive is required",
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

// PATCH — update member by row id (ADMIN+; only OWNER may set role to OWNER)
export async function PATCH(
  req: Request,
  props: { params: Promise<{ organizationId: string; memberId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    await requireOrgAdmin(clerkId, params.organizationId);

    const existing = await prismadb.organizationMember.findFirst({
      where: {
        id: params.memberId,
        organizationId: params.organizationId,
      },
    });
    if (!existing) return jsonError("Member not found", 404, "NOT_FOUND");

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new z.ZodError(parsed.error.issues);
    }

    const nextRole = (parsed.data.role ?? existing.role) as OrganizationRole;
    const nextActive = parsed.data.isActive ?? existing.isActive;

    if (parsed.data.role === "OWNER") {
      const requesterRole = await getUserOrgRole(clerkId, params.organizationId);
      if (requesterRole !== "OWNER") {
        return jsonError("Only an owner can assign the OWNER role.", 403, "FORBIDDEN");
      }
    }

    const blocked = await guardNotRemovingLastManager(
      params.organizationId,
      existing.userId,
      nextRole,
      nextActive
    );
    if (blocked) return blocked;

    const member = await prismadb.organizationMember.update({
      where: { id: params.memberId },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.email !== undefined
          ? { email: parsed.data.email ? parsed.data.email : null }
          : {}),
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
