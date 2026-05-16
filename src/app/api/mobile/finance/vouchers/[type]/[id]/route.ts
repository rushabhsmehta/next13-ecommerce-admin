import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { generatePDF } from "@/utils/generatepdf";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { resolveCompanyInfo, brandColors } from "@/lib/pdf/branding";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const inr = (n: number | null | undefined) =>
  `₹${Math.round(Number(n ?? 0)).toLocaleString("en-IN")}`;
const d = (x: Date | string | null | undefined) => {
  if (!x) return "—";
  try {
    return new Date(x).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

function voucherHtml(opts: {
  title: string;
  number: string;
  date: string;
  party: { name: string; contact?: string | null; email?: string | null };
  items: {
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
  }[];
  base: number;
  gst: number;
  total: number;
  company: ReturnType<typeof resolveCompanyInfo>;
}): string {
  const c = brandColors;
  const rows = opts.items.length
    ? opts.items
        .map(
          (it, i) => `<tr>
        <td style="padding:8px;border-bottom:1px solid ${c.border};">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid ${c.border};">${esc(
            it.productName
          )}</td>
        <td style="padding:8px;border-bottom:1px solid ${c.border};text-align:right;">${it.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid ${c.border};text-align:right;">${inr(
            it.pricePerUnit
          )}</td>
        <td style="padding:8px;border-bottom:1px solid ${c.border};text-align:right;">${inr(
            it.totalAmount
          )}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="padding:12px;text-align:center;color:${c.muted};">No itemised lines</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;}
    body{margin:0;color:${c.text};}
    .wrap{padding:28px;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${c.primary};padding-bottom:16px;}
    .logo{height:54px;}
    .co{text-align:right;font-size:12px;color:${c.muted};}
    .co b{color:${c.text};font-size:15px;}
    h1{color:${c.primary};font-size:22px;margin:20px 0 4px;}
    .meta{display:flex;justify-content:space-between;margin:14px 0;font-size:13px;}
    .box{background:${c.panelBg};border:1px solid ${c.border};border-radius:8px;padding:12px;font-size:13px;}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px;}
    th{background:${c.tableHeaderBg};color:${c.text};padding:8px;text-align:left;}
    .totals{margin-top:16px;width:260px;margin-left:auto;font-size:13px;}
    .totals div{display:flex;justify-content:space-between;padding:4px 0;}
    .grand{border-top:2px solid ${c.primary};margin-top:6px;padding-top:8px;font-size:16px;font-weight:bold;color:${c.primary};}
    .ftr{margin-top:30px;font-size:11px;color:${c.muted};text-align:center;border-top:1px solid ${c.border};padding-top:12px;}
  </style></head><body><div class="wrap">
    <div class="hdr">
      ${
        opts.company.logo
          ? `<img class="logo" src="${esc(opts.company.logo)}" alt="logo"/>`
          : `<b style="font-size:18px;color:${c.primary};">${esc(
              opts.company.name
            )}</b>`
      }
      <div class="co">
        <b>${esc(opts.company.name)}</b><br/>
        ${esc(opts.company.address)}<br/>
        ${esc(opts.company.phone)} · ${esc(opts.company.email)}
      </div>
    </div>
    <h1>${esc(opts.title)}</h1>
    <div class="meta">
      <div><b>No:</b> ${esc(opts.number)}</div>
      <div><b>Date:</b> ${esc(opts.date)}</div>
    </div>
    <div class="box">
      <b>${esc(opts.party.name)}</b><br/>
      ${opts.party.contact ? esc(opts.party.contact) + "<br/>" : ""}
      ${opts.party.email ? esc(opts.party.email) : ""}
    </div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${inr(opts.base)}</span></div>
      <div><span>GST</span><span>${inr(opts.gst)}</span></div>
      <div class="grand"><span>Total</span><span>${inr(opts.total)}</span></div>
    </div>
    <div class="ftr">${esc(
      opts.company.website
    )} · This is a system-generated voucher.</div>
  </div></body></html>`;
}

/**
 * Server-rendered sale/purchase voucher PDF for mobile. Bearer-auth +
 * finance.read — the document is composed here from the record's own data
 * and branding, so the Clerk-protected web voucher pages are NOT exposed
 * publicly. `[type]` = "sale" | "purchase".
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const [membership, ia] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { role: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    if (
      !buildMobileAdminProfile(membership?.role ?? null, ia.isAssociate)
        .permissions.includes("finance.read")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const params = await props.params;
    const type = params.type === "purchase" ? "purchase" : "sale";
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const org = await prismadb.organization.findFirst({
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
      },
    });
    const company = resolveCompanyInfo(
      "AH",
      org
        ? {
            name: org.name || undefined,
            address: org.address ?? undefined,
            phone: org.phone ?? undefined,
            email: org.email ?? undefined,
            website: org.website ?? undefined,
            logo: org.logoUrl ?? undefined,
          }
        : null
    );

    let html: string;
    let safeName: string;

    if (type === "sale") {
      const sale = await prismadb.saleDetail.findUnique({
        where: { id },
        include: { customer: true, items: { orderBy: { orderIndex: "asc" } } },
      });
      if (!sale) return new NextResponse("Not found", { status: 404 });
      const base = Number(sale.salePrice ?? 0);
      const gst = Number(sale.gstAmount ?? 0);
      html = voucherHtml({
        title: "Sale Invoice",
        number: sale.invoiceNumber || `#${sale.id.slice(0, 8)}`,
        date: d(sale.saleDate),
        party: {
          name: sale.customer?.name ?? "Customer",
          contact: sale.customer?.contact,
          email: sale.customer?.email,
        },
        items: sale.items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          pricePerUnit: it.pricePerUnit,
          totalAmount: it.totalAmount,
        })),
        base,
        gst,
        total: base + gst,
        company,
      });
      safeName = (sale.invoiceNumber || sale.id).replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      );
    } else {
      const purchase = await prismadb.purchaseDetail.findUnique({
        where: { id },
        include: { supplier: true, items: { orderBy: { orderIndex: "asc" } } },
      });
      if (!purchase) return new NextResponse("Not found", { status: 404 });
      const base = Number(purchase.price ?? 0);
      const gst = Number(purchase.gstAmount ?? 0);
      html = voucherHtml({
        title: "Purchase Bill",
        number: purchase.billNumber || `#${purchase.id.slice(0, 8)}`,
        date: d(purchase.purchaseDate),
        party: {
          name: purchase.supplier?.name ?? "Supplier",
          contact: purchase.supplier?.contact,
          email: purchase.supplier?.email,
        },
        items: purchase.items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          pricePerUnit: it.pricePerUnit,
          totalAmount: it.totalAmount,
        })),
        base,
        gst,
        total: base + gst,
        company,
      });
      safeName = (purchase.billNumber || purchase.id).replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      );
    }

    const pdf = await generatePDF(html);

    await recordMobileAudit({
      userId,
      entityType: type === "sale" ? "SaleVoucherPdf" : "PurchaseVoucherPdf",
      entityId: id,
      action: "READ",
      metadata: { bytes: pdf.length },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${
          type === "sale" ? "invoice" : "bill"
        }-${safeName.slice(0, 60)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_VOUCHER_PDF]", error);
    return new NextResponse("Voucher generation failed", { status: 500 });
  }
}
