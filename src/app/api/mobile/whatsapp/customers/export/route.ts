import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { exportWhatsAppCustomers } from "@/lib/whatsapp-customers";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  );
}

function csv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/"/g, '""');
  return /([",\n])/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const tags = parseTags(url.searchParams.get("tags"));
    const optedInParam = url.searchParams.get("isOptedIn");

    const customers = await exportWhatsAppCustomers({
      search,
      tags: tags.length ? tags : undefined,
      isOptedIn: optedInParam !== null ? optedInParam === "true" : undefined,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const partners = await prisma.associatePartner.findMany({
      select: { id: true, name: true },
    });
    const partnerNameById = new Map<string, string>();
    for (const p of partners) partnerNameById.set(p.id, p.name);

    const headers = [
      "First Name",
      "Last Name",
      "Mobile Number",
      "Email",
      "Tags",
      "Opt-In Status",
      "Notes",
      "Associate Partner",
      "Imported From",
      "Imported At",
      "Last Contacted At",
      "Created At",
      "Updated At",
    ];

    const rows = customers.map((c: any) => {
      const tagsValue = Array.isArray(c.tags)
        ? (c.tags as unknown[])
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .join("|")
        : "";
      const partnerName = c.associatePartnerId
        ? partnerNameById.get(c.associatePartnerId) ?? ""
        : "";
      return [
        csv(c.firstName),
        csv(c.lastName ?? ""),
        csv(c.phoneNumber),
        csv(c.email ?? ""),
        csv(tagsValue),
        csv(c.isOptedIn ? "Opted In" : "Opted Out"),
        csv(c.notes ?? ""),
        csv(partnerName),
        csv(c.importedFrom ?? ""),
        csv(c.importedAt ? c.importedAt.toISOString() : ""),
        csv(c.lastContactedAt ? c.lastContactedAt.toISOString() : ""),
        csv(c.createdAt.toISOString()),
        csv(c.updatedAt.toISOString()),
      ].join(",");
    });

    const body = ["﻿" + headers.join(","), ...rows].join("\r\n");
    const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 12);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppCustomerExport",
      entityId: stamp,
      action: "READ",
      metadata: { rows: customers.length },
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="whatsapp-customers-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_CUSTOMER_EXPORT]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export customers" },
      { status: 500 }
    );
  }
}
