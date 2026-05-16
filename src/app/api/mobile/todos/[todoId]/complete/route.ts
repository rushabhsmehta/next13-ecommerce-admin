import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const [membership, inquiryAccess] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { role: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    const profile = buildMobileAdminProfile(
      membership?.role ?? null,
      inquiryAccess.isAssociate
    );
    if (!profile.permissions.includes("todos.write")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { todoId } = await props.params;
    const existing = await prismadb.todoItem.findUnique({ where: { id: todoId } });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (existing.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    let displayName = "Unknown";
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      displayName =
        user.fullName ||
        user.firstName ||
        user.emailAddresses[0]?.emailAddress ||
        "Unknown";
    } catch {
      // best-effort; completion still proceeds
    }

    const updated = await prismadb.todoItem.update({
      where: { id: todoId },
      data: {
        status: "DONE",
        completedAt: new Date(),
        completedByName: displayName,
      },
      include: { assignedStaff: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[MOBILE_TODO_COMPLETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
