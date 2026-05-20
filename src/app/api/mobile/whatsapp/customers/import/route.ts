import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { upsertWhatsAppCustomers } from "@/lib/whatsapp-customers";
import { parseWhatsAppCustomerCsv } from "@/lib/whatsapp-customer-csv";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString("utf-8");
    if (!csvText.trim()) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const partners = await prisma.associatePartner.findMany({
      select: { id: true, name: true },
    });
    const partnerNameToIdMap = new Map<string, string>();
    for (const p of partners) partnerNameToIdMap.set(p.name, p.id);

    let parsed;
    try {
      parsed = parseWhatsAppCustomerCsv(csvText, {
        sourceName: file.name,
        partnerNameToIdMap,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Invalid CSV file" },
        { status: 400 }
      );
    }

    if (parsed.customers.length === 0) {
      return NextResponse.json(
        {
          error: "All CSV rows failed validation",
          summary: {
            created: 0,
            updated: 0,
            total: 0,
            totalRows: parsed.totalRows,
            validRows: parsed.validRows,
            skippedRows: parsed.skippedRows,
            failed: parsed.errors.length,
            uniquePhones: parsed.uniquePhones,
            duplicates: parsed.duplicates,
          },
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const result = await upsertWhatsAppCustomers(parsed.customers, {
      importedFrom: "csv-upload-mobile",
    });

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppCustomerImport",
      entityId: file.name || "upload",
      action: "CREATE",
      metadata: {
        created: result.created,
        updated: result.updated,
        attempted: parsed.customers.length,
        failed: parsed.errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      partial: parsed.errors.length > 0,
      summary: {
        created: result.created,
        updated: result.updated,
        total: parsed.customers.length,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        skippedRows: parsed.skippedRows,
        failed: parsed.errors.length,
        uniquePhones: parsed.uniquePhones,
        duplicates: parsed.duplicates,
      },
      errors: parsed.errors,
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_CUSTOMER_IMPORT]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import customers" },
      { status: 500 }
    );
  }
}
