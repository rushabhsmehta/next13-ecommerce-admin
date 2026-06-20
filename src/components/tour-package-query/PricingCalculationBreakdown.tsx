import React from "react";
import type { PricingCalculationParts } from "@/lib/variant-pricing-display";
import { VARIANT_PRICING_GST_PERCENT } from "@/lib/variant-pricing-discount";

const formatInr = (value: number): string =>
  `₹ ${Math.round(value).toLocaleString("en-IN")}`;

type BreakdownLine = {
  label: string;
  value: string;
  tone?: "base" | "discount" | "subtotal" | "gst";
};

function buildBreakdownLines(
  parts: PricingCalculationParts,
  baseLabel = "Base price"
): BreakdownLine[] {
  const lines: BreakdownLine[] = [];

  if (parts.qty > 1 && parts.qtyLabel) {
    lines.push({
      label: `${parts.qty} ${parts.qtyLabel} × ${formatInr(parts.unitBase)}`,
      value: formatInr(parts.lineBase),
      tone: "base",
    });
  } else {
    lines.push({
      label: baseLabel,
      value: formatInr(parts.unitBase),
      tone: "base",
    });
  }

  if (parts.discountPercent > 0) {
    lines.push({
      label: `Discount (${parts.discountPercent}%)`,
      value: `− ${formatInr(parts.discountAmount)}`,
      tone: "discount",
    });
    lines.push({
      label: "After discount",
      value: formatInr(parts.afterDiscount),
      tone: "subtotal",
    });
  } else if (parts.discountAmount > 0) {
    lines.push({
      label: "Discount",
      value: `− ${formatInr(parts.discountAmount)}`,
      tone: "discount",
    });
    lines.push({
      label: "After discount",
      value: formatInr(parts.afterDiscount),
      tone: "subtotal",
    });
  }

  lines.push({
    label: `GST (${VARIANT_PRICING_GST_PERCENT}%)`,
    value: `+ ${formatInr(parts.gstAmount)}`,
    tone: "gst",
  });

  return lines;
}

const toneClass: Record<NonNullable<BreakdownLine["tone"]>, string> = {
  base: "text-slate-700",
  discount: "text-emerald-700",
  subtotal: "text-slate-600",
  gst: "text-blue-700",
};

const toneValueClass: Record<NonNullable<BreakdownLine["tone"]>, string> = {
  base: "text-slate-900 font-medium",
  discount: "text-emerald-700 font-semibold",
  subtotal: "text-slate-700 font-medium",
  gst: "text-blue-700 font-semibold",
};

export function PricingCalculationBreakdown({
  parts,
  baseLabel = "Base price",
}: {
  parts: PricingCalculationParts;
  baseLabel?: string;
}) {
  const lines = buildBreakdownLines(parts, baseLabel);

  return (
    <div className="w-full max-w-[240px] rounded-lg border border-orange-100 bg-gradient-to-b from-orange-50/80 to-white px-3 py-2.5 shadow-sm">
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
  options: { mutedColor?: string; borderColor?: string; panelBg?: string; baseLabel?: string } = {}
): string {
  const {
    mutedColor = "#6B7280",
    borderColor = "#FED7AA",
    panelBg = "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)",
    baseLabel = "Base price",
  } = options;

  const lines = buildBreakdownLines(parts, baseLabel);
  const toneColor: Record<NonNullable<BreakdownLine["tone"]>, string> = {
    base: mutedColor,
    discount: "#047857",
    subtotal: "#475569",
    gst: "#1D4ED8",
  };

  const rows = lines
    .map(
      (line) => `
      <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 9px; line-height: 1.35; margin-bottom: 4px;">
        <span style="color: ${toneColor[line.tone ?? "base"]}; text-align: left;">${line.label}</span>
        <span style="color: ${toneColor[line.tone ?? "base"]}; font-weight: 600; white-space: nowrap;">${line.value}</span>
      </div>`
    )
    .join("");

  return `
    <div style="margin-top: 8px; width: 100%; max-width: 220px; margin-left: auto; margin-right: auto; border: 1px solid ${borderColor}; border-radius: 8px; background: ${panelBg}; padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      ${rows}
    </div>
  `;
}
