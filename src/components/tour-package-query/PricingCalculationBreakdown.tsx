import React from "react";
import type { PricingCalculationParts } from "@/lib/variant-pricing-display";
import { VARIANT_PRICING_GST_PERCENT } from "@/lib/variant-pricing-discount";

const formatInr = (value: number): string =>
  `₹ ${Math.round(value).toLocaleString("en-IN")}`;

type BreakdownLine = {
  label: string;
  value: string;
  tone?: "base" | "discount" | "subtotal" | "gst" | "total";
};

/** Muted qty × unit line shown above the breakdown stack (e.g. "7 Adults × ₹ 24,581"). */
export function buildQtySubtitle(parts: PricingCalculationParts): string | null {
  if (parts.qty > 1 && parts.qtyLabel) {
    return `${parts.qty} ${parts.qtyLabel} × ${formatInr(parts.unitBase)}`;
  }
  return null;
}

export function buildBreakdownLines(
  parts: PricingCalculationParts,
  baseLabel = "Base amount"
): BreakdownLine[] {
  const lines: BreakdownLine[] = [];

  lines.push({
    label: baseLabel,
    value: formatInr(parts.lineBase),
    tone: "base",
  });

  if (parts.discountAmount > 0) {
    lines.push({
      label:
        parts.discountPercent > 0 ? `Discount (${parts.discountPercent}%)` : "Discount",
      value: `− ${formatInr(parts.discountAmount)}`,
      tone: "discount",
    });
    lines.push({
      label: "Net amount",
      value: formatInr(parts.afterDiscount),
      tone: "subtotal",
    });
  }

  lines.push({
    label: `GST (${VARIANT_PRICING_GST_PERCENT}%)`,
    value: `+ ${formatInr(parts.gstAmount)}`,
    tone: "gst",
  });

  lines.push({
    label: "Total",
    value: formatInr(parts.netLineTotal),
    tone: "total",
  });

  return lines;
}

const toneClass: Record<NonNullable<BreakdownLine["tone"]>, string> = {
  base: "text-slate-700",
  discount: "text-emerald-700",
  subtotal: "text-slate-600",
  gst: "text-blue-700",
  total: "text-red-800",
};

const toneValueClass: Record<NonNullable<BreakdownLine["tone"]>, string> = {
  base: "text-slate-900 font-medium",
  discount: "text-emerald-700 font-semibold",
  subtotal: "text-slate-700 font-medium",
  gst: "text-blue-700 font-semibold",
  total: "text-red-800 font-bold",
};

export function PricingCalculationBreakdown({
  parts,
  baseLabel = "Base amount",
  qtySubtitle,
}: {
  parts: PricingCalculationParts;
  baseLabel?: string;
  qtySubtitle?: string | null;
}) {
  const lines = buildBreakdownLines(parts, baseLabel);
  const subtitle = qtySubtitle ?? buildQtySubtitle(parts);

  return (
    <div className="w-full max-w-[240px] rounded-lg border border-orange-100 bg-gradient-to-b from-orange-50/80 to-white px-3 py-2.5 shadow-sm">
      {subtitle ? (
        <div className="text-[9px] text-gray-500 mb-1.5 leading-tight">{subtitle}</div>
      ) : null}
      <div className="space-y-1.5">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between gap-3 text-[10px] leading-tight"
          >
            <span className={`${toneClass[line.tone ?? "base"]} text-left`}>{line.label}</span>
            <span className={`${toneValueClass[line.tone ?? "base"]} whitespace-nowrap tabular-nums`}>
              {line.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** HTML snippet for variant PDF price comparison cells. */
export function buildPricingCalculationBreakdownHtml(
  parts: PricingCalculationParts,
  options: {
    mutedColor?: string;
    borderColor?: string;
    panelBg?: string;
    baseLabel?: string;
    qtySubtitle?: string | null;
    primaryColor?: string;
  } = {}
): string {
  const {
    mutedColor = "#6B7280",
    borderColor = "#FED7AA",
    panelBg = "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)",
    baseLabel = "Base amount",
    qtySubtitle,
    primaryColor = "#B91C1C",
  } = options;

  const subtitle = qtySubtitle ?? buildQtySubtitle(parts);
  const lines = buildBreakdownLines(parts, baseLabel);
  const toneColor: Record<NonNullable<BreakdownLine["tone"]>, string> = {
    base: mutedColor,
    discount: "#047857",
    subtotal: "#475569",
    gst: "#1D4ED8",
    total: primaryColor,
  };

  const subtitleHtml = subtitle
    ? `<div style="font-size: 8px; color: ${mutedColor}; margin-bottom: 6px; line-height: 1.3;">${subtitle}</div>`
    : "";

  const rows = lines
    .map(
      (line) => `
      <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 9px; line-height: 1.35; margin-bottom: 4px;">
        <span style="color: ${toneColor[line.tone ?? "base"]}; text-align: left;">${line.label}</span>
        <span style="color: ${toneColor[line.tone ?? "base"]}; font-weight: ${line.tone === "total" ? "800" : "600"}; white-space: nowrap;">${line.value}</span>
      </div>`
    )
    .join("");

  return `
    <div style="width: 100%; max-width: 220px; margin-left: auto; margin-right: auto; border: 1px solid ${borderColor}; border-radius: 8px; background: ${panelBg}; padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      ${subtitleHtml}
      ${rows}
    </div>
  `;
}
