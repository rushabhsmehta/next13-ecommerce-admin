import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { generatePDF } from "@/utils/generatepdf";
import { companyInfo, brandColors } from "@/lib/pdf";
import { formatSafeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ── Auth ──────────────────────────────────────────────────────────────────────

function checkMcpSecret(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  return !!(secret && secret === process.env.MCP_API_SECRET);
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchQueryData(id: string) {
  return prismadb.tourPackageQuery.findUnique({
    where: { id },
    include: {
      location: { select: { id: true, label: true } },
      itineraries: {
        include: {
          hotel: { select: { id: true, name: true } },
          mealPlan: { select: { id: true, name: true } },
          activities: {
            select: { activityTitle: true, activityDescription: true },
          },
          roomAllocations: {
            include: {
              roomType: { select: { id: true, name: true } },
              occupancyType: { select: { id: true, name: true } },
              mealPlan: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { dayNumber: "asc" },
      },
      queryVariantSnapshots: {
        include: {
          hotelSnapshots: { orderBy: { dayNumber: "asc" } },
          pricingSnapshots: {
            include: { pricingComponentSnapshots: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

type QueryData = NonNullable<Awaited<ReturnType<typeof fetchQueryData>>>;

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parsePolicyField(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return [val]; }
  }
  return [];
}

function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildStyles(): string {
  const c = brandColors;
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: ${c.text}; background: #fff; }
      .page { padding: 28px 32px; }
      h1 { font-size: 22px; color: ${c.primary}; }
      h2 { font-size: 15px; color: ${c.primary}; border-bottom: 2px solid ${c.primary}; padding-bottom: 4px; margin: 20px 0 10px; }
      h3 { font-size: 13px; color: ${c.secondary}; margin-bottom: 4px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid ${c.primary}; padding-bottom: 12px; }
      .company-name { font-size: 20px; font-weight: 700; color: ${c.primary}; }
      .company-sub { font-size: 11px; color: ${c.muted}; margin-top: 2px; }
      .query-num { font-size: 11px; color: ${c.muted}; text-align: right; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; }
      .info-row { display: flex; gap: 8px; }
      .info-label { font-weight: 600; color: ${c.muted}; min-width: 90px; }
      .info-value { color: ${c.text}; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
      th { background: ${c.tableHeaderBg}; color: ${c.secondary}; font-weight: 600; padding: 7px 10px; text-align: left; border: 1px solid ${c.border}; }
      td { padding: 7px 10px; border: 1px solid ${c.border}; vertical-align: top; }
      tr:nth-child(even) td { background: ${c.subtlePanel}; }
      .day-badge { display: inline-block; background: ${c.primary}; color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-bottom: 4px; }
      .activity-list { padding-left: 14px; margin: 4px 0; }
      .activity-list li { margin-bottom: 2px; color: ${c.slateText}; }
      .room-chip { display: inline-block; background: ${c.lightOrange}; border: 1px solid ${c.border}; border-radius: 3px; padding: 2px 6px; margin: 2px 2px 0 0; font-size: 10px; }
      .variant-name { font-weight: 700; color: ${c.primary}; font-size: 13px; }
      .pricing-total { font-weight: 700; color: ${c.success}; }
      .bullet-list { padding-left: 18px; }
      .bullet-list li { margin-bottom: 3px; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .policy-section { margin-bottom: 12px; }
      .footer { margin-top: 24px; border-top: 2px solid ${c.border}; padding-top: 10px; font-size: 10px; color: ${c.muted}; text-align: center; }
      @media print { .page { padding: 0; } }
    </style>
  `;
}

function buildHeader(q: QueryData): string {
  const co = companyInfo["AH"];
  return `
    <div class="header">
      <div>
        <div class="company-name">${esc(co.name)}</div>
        <div class="company-sub">${esc(co.address)}</div>
        <div class="company-sub">📞 ${esc(co.phone)} | ✉ ${esc(co.email)}</div>
      </div>
      <div class="query-num">
        <div style="font-size:14px;font-weight:700;color:#DC2626">TOUR QUOTATION</div>
        <div>Ref: ${esc(q.tourPackageQueryNumber ?? "")}</div>
        <div>Date: ${new Date().toLocaleDateString("en-IN")}</div>
      </div>
    </div>
  `;
}

function buildCustomerInfo(q: QueryData): string {
  const rows = [
    ["Customer", q.customerName],
    ["Phone", q.customerNumber],
    ["Destination", q.location?.label],
    ["Package", q.tourPackageQueryName],
    ["Duration", q.numDaysNight],
    ["Tour Type", q.tourPackageQueryType],
    ["Start Date", q.tourStartsFrom ? formatSafeDate(q.tourStartsFrom) : null],
    ["End Date", q.tourEndsOn ? formatSafeDate(q.tourEndsOn) : null],
    ["Adults", q.numAdults],
    ["Children (5-12)", q.numChild5to12],
    ["Children (0-5)", q.numChild0to5],
    ["Transport", q.transport],
    ["Pickup", q.pickup_location],
    ["Drop", q.drop_location],
  ].filter(([, v]) => v);

  const cells = rows.map(([label, value]) => `
    <div class="info-row">
      <span class="info-label">${esc(String(label))}:</span>
      <span class="info-value">${esc(String(value))}</span>
    </div>
  `).join("");

  return `<h2>Booking Details</h2><div class="info-grid">${cells}</div>`;
}

function buildItinerary(q: QueryData): string {
  if (!q.itineraries || q.itineraries.length === 0) return "";

  const rows = (q.itineraries as any[]).map((it: any) => {
    const activities = ((it.activities ?? []) as any[])
      .filter((a: any) => a.activityTitle)
      .map((a: any) => `<li>${esc(a.activityTitle)}${a.activityDescription ? ` — ${esc(a.activityDescription)}` : ""}</li>`)
      .join("");
    const activitiesHtml = activities ? `<ul class="activity-list">${activities}</ul>` : "<em style='color:#9CA3AF'>Rest / Transfer</em>";

    const rooms = ((it.roomAllocations ?? []) as any[]).map((ra: any) => {
      const rt = (ra as any).roomType?.name ?? "";
      const ot = (ra as any).occupancyType?.name ?? "";
      const mp = (ra as any).mealPlan?.name ?? "";
      const qty = ra.quantity > 1 ? ` ×${ra.quantity}` : "";
      return `<span class="room-chip">${esc(ot)}${rt ? ` / ${esc(rt)}` : ""}${mp ? ` (${esc(mp)})` : ""}${qty}</span>`;
    }).join("");

    return `
      <tr>
        <td style="width:8%;white-space:nowrap">
          <span class="day-badge">Day ${it.dayNumber ?? ""}</span>
        </td>
        <td style="width:22%">
          <strong>${esc(it.itineraryTitle)}</strong>
          ${it.itineraryDescription ? `<div style="color:#6B7280;font-size:10px;margin-top:2px">${esc(it.itineraryDescription)}</div>` : ""}
        </td>
        <td style="width:18%">${esc((it as any).hotel?.name)}</td>
        <td style="width:30%">${activitiesHtml}</td>
        <td style="width:22%">${rooms || "—"}</td>
      </tr>
    `;
  }).join("");

  return `
    <h2>Day-by-Day Itinerary</h2>
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Title</th>
          <th>Hotel</th>
          <th>Activities</th>
          <th>Room / Occupancy</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildVariants(q: QueryData): string {
  const snapshots = q.queryVariantSnapshots;
  if (!snapshots || snapshots.length === 0) return "";

  const variantSections = (snapshots as any[]).map((variant: any) => {
    // Hotels per day
    const hotelRows = ((variant.hotelSnapshots ?? []) as any[]).map((hs: any) => `
      <tr>
        <td>Day ${hs.dayNumber}</td>
        <td>${esc(hs.hotelName)}</td>
        <td>${esc(hs.locationLabel)}</td>
      </tr>
    `).join("");

    const hotelsTable = hotelRows ? `
      <table style="margin-bottom:10px">
        <thead><tr><th>Day</th><th>Hotel</th><th>Location</th></tr></thead>
        <tbody>${hotelRows}</tbody>
      </table>
    ` : "";

    // Pricing
    const pricingRows = ((variant.pricingSnapshots ?? []) as any[]).map((ps: any) => {
      const components = ((ps.pricingComponentSnapshots ?? []) as any[]).map((pc: any) => `
        <tr>
          <td style="padding-left:20px;color:#6B7280">${esc(pc.attributeName)}</td>
          <td></td>
          <td>${formatPrice(Number(pc.price))}</td>
        </tr>
      `).join("");
      return `
        <tr>
          <td><strong>${esc(ps.mealPlanName)}</strong>${ps.vehicleTypeName ? ` + ${esc(ps.vehicleTypeName)}` : ""}${ps.numberOfRooms > 1 ? ` (${ps.numberOfRooms} rooms)` : ""}</td>
          <td>${ps.description ? esc(ps.description) : ""}</td>
          <td class="pricing-total">${formatPrice(Number(ps.totalPrice))}</td>
        </tr>
        ${components}
      `;
    }).join("");

    const pricingTable = pricingRows ? `
      <table>
        <thead><tr><th>Meal Plan / Vehicle</th><th>Notes</th><th>Price</th></tr></thead>
        <tbody>${pricingRows}</tbody>
      </table>
    ` : "<em style='color:#9CA3AF'>Pricing not configured</em>";

    return `
      <div style="margin-bottom:20px;border:1px solid #E5E7EB;border-radius:6px;padding:14px">
        <div class="variant-name" style="margin-bottom:8px">${esc(variant.name)}</div>
        ${variant.description ? `<div style="color:#6B7280;font-size:11px;margin-bottom:8px">${esc(variant.description)}</div>` : ""}
        ${hotelsTable}
        ${pricingTable}
      </div>
    `;
  }).join("");

  return `<h2>Package Variants &amp; Pricing</h2>${variantSections}`;
}

function buildPolicySection(title: string, items: unknown): string {
  const list = parsePolicyField(items);
  if (list.length === 0) return "";
  const bullets = list.map(item => `<li>${esc(item)}</li>`).join("");
  return `
    <div class="policy-section">
      <h3>${esc(title)}</h3>
      <ul class="bullet-list">${bullets}</ul>
    </div>
  `;
}

function buildPolicies(q: QueryData): string {
  const sections = [
    buildPolicySection("Inclusions", q.inclusions),
    buildPolicySection("Exclusions", q.exclusions),
    buildPolicySection("Important Notes", q.importantNotes),
    buildPolicySection("Payment Policy", q.paymentPolicy),
    buildPolicySection("Cancellation Policy", q.cancellationPolicy),
    buildPolicySection("Airline Cancellation Policy", q.airlineCancellationPolicy),
    buildPolicySection("Useful Tips", q.usefulTip),
    buildPolicySection("Terms & Conditions", q.termsconditions),
    buildPolicySection("Kitchen / Group Policy", q.kitchenGroupPolicy),
  ].filter(Boolean).join("");

  if (!sections) return "";
  return `<h2>Policies &amp; Notes</h2>${sections}`;
}

function buildTotalPrice(q: QueryData): string {
  if (!q.totalPrice) return "";
  return `
    <div style="text-align:right;margin:16px 0;padding:12px 16px;background:#FFF3EC;border:1px solid #E5E7EB;border-radius:6px">
      <span style="font-size:15px;font-weight:700;color:#DC2626">Total Package Price: ${formatPrice(q.totalPrice)}</span>
      ${q.remarks ? `<div style="font-size:11px;color:#6B7280;margin-top:4px">Remarks: ${esc(q.remarks)}</div>` : ""}
    </div>
  `;
}

function buildFooter(): string {
  const co = companyInfo["AH"];
  return `
    <div class="footer">
      ${esc(co.name)} | ${esc(co.phone)} | ${esc(co.email)} | ${esc(co.website)}
      <br>Thank you for choosing us for your travel needs.
    </div>
  `;
}

function buildHtml(q: QueryData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tour Quotation - ${esc(q.tourPackageQueryNumber ?? "")}</title>
      ${buildStyles()}
    </head>
    <body>
      <div class="page">
        ${buildHeader(q)}
        ${buildCustomerInfo(q)}
        ${buildItinerary(q)}
        ${buildVariants(q)}
        ${buildTotalPrice(q)}
        ${buildPolicies(q)}
        ${buildFooter()}
      </div>
    </body>
    </html>
  `;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!checkMcpSecret(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new NextResponse("Tour query ID is required", { status: 400 });
  }

  try {
    const query = await fetchQueryData(id);
    if (!query) {
      return new NextResponse(`Tour query ${id} not found`, { status: 404 });
    }

    const htmlContent = buildHtml(query);
    const pdfBuffer = await generatePDF(htmlContent, {
      margin: { top: "20mm", right: "12mm", bottom: "20mm", left: "12mm" },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tour-query-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[MCP_TOUR_QUERY_PDF]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return new NextResponse(msg, { status: 500 });
  }
}
