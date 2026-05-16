import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  readIdempotencyKey,
  findPriorIdempotentEntityId,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
  role: z.enum(["OPERATIONS", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

/** Operational staff directory — list + create. operations.read / .write. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search")?.trim() ?? "";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const staff = await prismadb.operationalStaff.findMany({
      where,
      // Never select `password`.
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ staff, total: staff.length });
  } catch (error) {
    console.log("[MOBILE_OPS_STAFF_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("OperationalStaff", key);
    if (prior) {
      const existing = await prismadb.operationalStaff.findUnique({
        where: { id: prior },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      return NextResponse.json(
        { ...existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid staff payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const emailTaken = await prismadb.operationalStaff.findUnique({
      where: { email: v.email },
      select: { id: true },
    });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(v.password, 10);
    const created = await prismadb.operationalStaff.create({
      data: {
        name: v.name.trim(),
        email: v.email.trim(),
        password: hashedPassword,
        role: v.role ?? "OPERATIONS",
        isActive: v.isActive ?? true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "OperationalStaff",
      entityId: created.id,
      action: "CREATE",
      // Never put the password (or its hash) in audit metadata.
      metadata: {
        idempotencyKey: key ?? undefined,
        name: created.name,
        role: created.role,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_STAFF_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
