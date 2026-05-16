import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(["OPERATIONS", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  // Optional — only re-hash when a new password is supplied.
  password: z.string().min(6).max(200).optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const staff = await prismadb.operationalStaff.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!staff) return new NextResponse("Not found", { status: 404 });

    const assignedInquiries = await prismadb.inquiry.count({
      where: { assignedToStaffId: params.id },
    });

    return NextResponse.json({ staff, summary: { assignedInquiries } });
  } catch (error) {
    console.log("[MOBILE_OPS_STAFF_DETAIL]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid staff payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const existing = await prismadb.operationalStaff.findUnique({
      where: { id: params.id },
      select: { id: true, email: true },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    if (v.email !== existing.email) {
      const taken = await prismadb.operationalStaff.findFirst({
        where: { email: v.email, NOT: { id: params.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {
      name: v.name.trim(),
      email: v.email.trim(),
    };
    if (v.role) data.role = v.role;
    if (typeof v.isActive === "boolean") data.isActive = v.isActive;
    if (v.password && v.password.trim().length >= 6) {
      data.password = await bcrypt.hash(v.password, 10);
    }

    const staff = await prismadb.operationalStaff.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "OperationalStaff",
      entityId: staff.id,
      action: "UPDATE",
      metadata: {
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
        passwordChanged: Boolean(v.password),
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.log("[MOBILE_OPS_STAFF_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    // Don't orphan assignment history — deactivate instead of delete when
    // the staff member has assigned inquiries.
    const assigned = await prismadb.inquiry.count({
      where: { assignedToStaffId: params.id },
    });
    if (assigned > 0) {
      const staff = await prismadb.operationalStaff.update({
        where: { id: params.id },
        data: { isActive: false },
        select: { id: true, name: true, isActive: true },
      });
      await recordMobileAudit({
        userId,
        entityType: "OperationalStaff",
        entityId: staff.id,
        action: "UPDATE",
        metadata: { softDelete: true, reason: "assigned inquiries", assigned },
      });
      return NextResponse.json({ deactivated: true, staff });
    }

    const staff = await prismadb.operationalStaff.delete({
      where: { id: params.id },
      select: { id: true, name: true },
    });
    await recordMobileAudit({
      userId,
      entityType: "OperationalStaff",
      entityId: staff.id,
      action: "DELETE",
      metadata: { name: staff.name },
    });
    return NextResponse.json({ deleted: true, staff });
  } catch (error) {
    console.log("[MOBILE_OPS_STAFF_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
