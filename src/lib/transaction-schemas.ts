import * as z from "zod";

/**
 * Shared Zod schemas for financial transaction forms (sales, purchases, returns).
 * Eliminates duplication across sale-form-dialog, purchase-form-dialog,
 * sale-return-form, and purchase-return-form.
 */

/** Base line item schema shared across all transaction types */
export const baseLineItemSchema = z.object({
  id: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitOfMeasureId: z.string().optional().nullable(),
  pricePerUnit: z.coerce.number().min(0.01, "Price per unit must be greater than 0"),
  taxSlabId: z.string().optional().nullable(),
  taxAmount: z.coerce.number().min(0).optional().nullable(),
  totalAmount: z.coerce.number().min(0),
});

/** Line item schema for returns (allows zero price) */
export const returnLineItemSchema = baseLineItemSchema.extend({
  pricePerUnit: z.coerce.number().min(0, "Price must be zero or positive"),
  taxAmount: z.coerce.number().min(0, "Tax amount must be zero or positive").optional(),
  totalAmount: z.coerce.number().min(0, "Total amount must be zero or positive"),
});

/** Default empty item for adding new rows */
export const emptyLineItem = {
  productName: "",
  description: "",
  quantity: 1,
  unitOfMeasureId: "",
  pricePerUnit: 0,
  taxSlabId: "",
  taxAmount: 0,
  totalAmount: 0,
};

/** Tax slab interface used across all transaction forms */
export interface TaxSlab {
  id: string;
  name: string;
  percentage: number;
}

/** Unit of measure interface */
export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
}

/**
 * Recalculate line item totals.
 * Supports bidirectional calculation:
 * - If totalAmount changed: calculate pricePerUnit backwards
 * - Otherwise: calculate totalAmount from pricePerUnit * quantity + tax
 */
export function recalculateLineItems(
  items: Array<{
    quantity?: number | string;
    pricePerUnit?: number | string;
    totalAmount?: number | string;
    taxSlabId?: string | null;
    taxAmount?: number | string | null;
  }>,
  taxSlabs: TaxSlab[],
  changedField?: string
): {
  updates: Record<string, number>;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
} {
  let totalPriceExclTax = 0;
  let totalTax = 0;
  const updates: Record<string, number> = {};

  items.forEach((item, index) => {
    if (changedField?.includes(`items.${index}.totalAmount`)) {
      // Direction: Total → Price per unit (reverse calculation)
      const totalAmount = Number(parseFloat(item.totalAmount?.toString() || "0").toFixed(2));
      updates[`items.${index}.totalAmount`] = totalAmount;

      const qty = Number(parseFloat(item.quantity?.toString() || "1").toFixed(2));
      const taxSlab = item.taxSlabId ? taxSlabs.find(tax => tax.id === item.taxSlabId) : null;
      const taxRate = taxSlab ? taxSlab.percentage / 100 : 0;

      let pricePerUnit: number;
      let taxAmount: number;

      if (taxRate > 0) {
        const priceBeforeTax = totalAmount / (1 + taxRate);
        pricePerUnit = Number((priceBeforeTax / qty).toFixed(4));
        const itemSubtotal = Number((pricePerUnit * qty).toFixed(2));
        taxAmount = Number((totalAmount - itemSubtotal).toFixed(2));
      } else {
        pricePerUnit = Number((totalAmount / qty).toFixed(4));
        taxAmount = 0;
      }

      updates[`items.${index}.pricePerUnit`] = pricePerUnit;
      updates[`items.${index}.taxAmount`] = taxAmount;

      const itemSubtotal = Number((pricePerUnit * qty).toFixed(2));
      totalPriceExclTax += itemSubtotal;
      totalTax += taxAmount;
    } else {
      // Direction: Price per unit → Total (forward calculation)
      const price = Number(parseFloat(item.pricePerUnit?.toString() || "0").toFixed(4));
      const qty = Number(parseFloat(item.quantity?.toString() || "0").toFixed(2));
      const itemSubtotal = Number((price * qty).toFixed(2));
      totalPriceExclTax += itemSubtotal;

      let taxAmount = 0;
      if (item.taxSlabId && price > 0 && qty > 0) {
        const taxSlab = taxSlabs.find(tax => tax.id === item.taxSlabId);
        if (taxSlab) {
          taxAmount = Number(((itemSubtotal * taxSlab.percentage) / 100).toFixed(2));
          totalTax += taxAmount;
        }
      }
      updates[`items.${index}.taxAmount`] = taxAmount;

      const total = Number((itemSubtotal + taxAmount).toFixed(2));
      updates[`items.${index}.totalAmount`] = total;
    }
  });

  return {
    updates,
    subtotal: Number(totalPriceExclTax.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    grandTotal: Number((totalPriceExclTax + totalTax).toFixed(2)),
  };
}

/**
 * Extract form validation error messages from react-hook-form errors object.
 */
export function extractFormErrors(errors: Record<string, any>): string[] {
  const errorMessages: string[] = [];
  Object.entries(errors).forEach(([key, value]: [string, any]) => {
    if (key === 'items') {
      if (Array.isArray(value)) {
        value.forEach((itemError: any, index: number) => {
          if (itemError) {
            Object.values(itemError).forEach((error: any) => {
              if (error?.message) {
                errorMessages.push(`Item ${index + 1}: ${error.message}`);
              }
            });
          }
        });
      }
    } else if (value?.message) {
      errorMessages.push(`${key}: ${value.message}`);
    }
  });
  return errorMessages;
}
