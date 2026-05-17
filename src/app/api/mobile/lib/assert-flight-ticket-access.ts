import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

async function load(userId: string, permission: "flightTickets.read" | "flightTickets.write") {
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
  if (!profile.permissions.includes(permission)) {
    return { ok: false as const, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { ok: true as const };
}

export function requireFlightTicketsRead(userId: string) {
  return load(userId, "flightTickets.read");
}

export function requireFlightTicketsWrite(userId: string) {
  return load(userId, "flightTickets.write");
}
