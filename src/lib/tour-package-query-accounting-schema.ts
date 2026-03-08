import * as z from "zod";

const formPurchaseDetailSchema = z.object({
  supplierId: z.string(),
  purchaseDate: z.date(),
  price: z.number(),
  gstAmount: z.number().optional(),
  gstPercentage: z.number().optional(),
  description: z.string().optional(),
});

const formSaleDetailSchema = z.object({
  customerId: z.string(),
  saleDate: z.date(),
  salePrice: z.number(),
  gstAmount: z.number().optional(),
  gstPercentage: z.number().optional(),
  description: z.string().optional(),
});

const formPaymentDetailSchema = z.object({
  paymentDate: z.date(),
  amount: z.number(),
  accountId: z.string(),
  transactionId: z.string().optional(),
  note: z.string().optional(),
  supplierId: z.string().optional(),
});

const formReceiptDetailSchema = z.object({
  receiptDate: z.date(),
  amount: z.number(),
  accountId: z.string(),
  note: z.string().optional(),
  customerId: z.string().optional(),
});

const formExpenseDetailSchema = z.object({
  expenseDate: z.date(),
  amount: z.number(),
  expenseCategory: z.string(),
  accountId: z.string(),
  description: z.string().optional(),
});

const formIncomeDetailSchema = z.object({
  incomeDate: z.date(),
  amount: z.number(),
  incomeCategory: z.string(),
  accountId: z.string(),
  description: z.string().optional(),
});

export const tourPackageQueryAccountingFormSchema = z.object({
  purchaseDetails: z.array(formPurchaseDetailSchema).default([]),
  saleDetails: z.array(formSaleDetailSchema).default([]),
  paymentDetails: z.array(formPaymentDetailSchema).default([]),
  receiptDetails: z.array(formReceiptDetailSchema).default([]),
  expenseDetails: z.array(formExpenseDetailSchema).default([]),
  incomeDetails: z.array(formIncomeDetailSchema).default([]),
});

const dateInputSchema = z.union([z.string(), z.date()]);
const numberInputSchema = z.union([z.number(), z.string()]);
const optionalNumberInputSchema = z.union([z.number(), z.string()]).nullable().optional();
const optionalDateInputSchema = z.union([z.string(), z.date()]).nullable().optional();
const accountTypeSchema = z.enum(["bank", "cash", "unknown"]);

const purchaseItemPayloadSchema = z.object({
  productName: z.string(),
  description: z.string().nullable().optional(),
  quantity: numberInputSchema,
  unitOfMeasureId: z.string().nullable().optional(),
  pricePerUnit: numberInputSchema,
  taxSlabId: z.string().nullable().optional(),
  taxAmount: optionalNumberInputSchema,
  totalAmount: numberInputSchema,
});

const purchaseDetailPayloadSchema = z.object({
  supplierId: z.string().nullable().optional(),
  purchaseDate: dateInputSchema,
  billNumber: z.string().nullable().optional(),
  billDate: optionalDateInputSchema,
  dueDate: optionalDateInputSchema,
  stateOfSupply: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  price: numberInputSchema,
  gstAmount: optionalNumberInputSchema,
  gstPercentage: optionalNumberInputSchema,
  description: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  items: z.array(purchaseItemPayloadSchema).optional(),
});

const saleItemPayloadSchema = z.object({
  productName: z.string(),
  description: z.string().nullable().optional(),
  quantity: numberInputSchema,
  unitOfMeasureId: z.string().nullable().optional(),
  pricePerUnit: numberInputSchema,
  taxSlabId: z.string().nullable().optional(),
  taxAmount: optionalNumberInputSchema,
  totalAmount: numberInputSchema,
});

const saleDetailPayloadSchema = z.object({
  customerId: z.string().nullable().optional(),
  saleDate: dateInputSchema,
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: optionalDateInputSchema,
  dueDate: optionalDateInputSchema,
  stateOfSupply: z.string().nullable().optional(),
  salePrice: numberInputSchema,
  gstAmount: optionalNumberInputSchema,
  gstPercentage: optionalNumberInputSchema,
  description: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  items: z.array(saleItemPayloadSchema).optional(),
});

const accountBoundPayloadSchema = z.object({
  accountType: accountTypeSchema.optional(),
  accountId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  cashAccountId: z.string().nullable().optional(),
});

const paymentDetailPayloadSchema = accountBoundPayloadSchema.extend({
  supplierId: z.string().nullable().optional(),
  paymentDate: dateInputSchema,
  amount: numberInputSchema,
  method: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const receiptDetailPayloadSchema = accountBoundPayloadSchema.extend({
  customerId: z.string().nullable().optional(),
  receiptDate: dateInputSchema,
  amount: numberInputSchema,
  reference: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const expenseDetailPayloadSchema = accountBoundPayloadSchema.extend({
  expenseDate: dateInputSchema,
  amount: numberInputSchema,
  expenseCategoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const incomeDetailPayloadSchema = accountBoundPayloadSchema.extend({
  incomeDate: dateInputSchema,
  amount: numberInputSchema,
  incomeCategoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const tourPackageQueryAccountingRequestSchema = z.object({
  purchaseDetails: z.array(purchaseDetailPayloadSchema).optional(),
  saleDetails: z.array(saleDetailPayloadSchema).optional(),
  paymentDetails: z.array(paymentDetailPayloadSchema).optional(),
  receiptDetails: z.array(receiptDetailPayloadSchema).optional(),
  expenseDetails: z.array(expenseDetailPayloadSchema).optional(),
  incomeDetails: z.array(incomeDetailPayloadSchema).optional(),
});

export type TourPackageQueryAccountingFormValues = z.infer<typeof tourPackageQueryAccountingFormSchema>;
export type TourPackageQueryAccountingPayload = z.infer<typeof tourPackageQueryAccountingRequestSchema>;
