import type {
  ExpenseDetail,
  IncomeDetail,
  PaymentDetail,
  PurchaseDetail,
  ReceiptDetail,
  SaleDetail,
} from "@prisma/client";
import type { AccountingAccountOption } from "./accounting-form-options";
import {
  tourPackageQueryAccountingFormSchema as formSchema,
  type TourPackageQueryAccountingFormValues,
  type TourPackageQueryAccountingPayload,
} from "@/lib/tour-package-query-accounting-schema";

export { formSchema, type TourPackageQueryAccountingFormValues };

type AccountingInitialData = {
  purchaseDetails: PurchaseDetail[] | null;
  saleDetails: SaleDetail[] | null;
  paymentDetails: PaymentDetail[] | null;
  receiptDetails: ReceiptDetail[] | null;
  expenseDetails: ExpenseDetail[] | null;
  incomeDetails: IncomeDetail[] | null;
} | null;

type AccountType = AccountingAccountOption["type"] | "unknown";

export type AccountingSubmitPayload = TourPackageQueryAccountingPayload;

export function calculateGSTAmount(price: number, percentage: number): number {
  if (price <= 0 || percentage <= 0) {
    return 0;
  }

  return Number(((price * percentage) / 100).toFixed(2));
}

function resolveAccountType(
  accountId: string,
  allAccounts: AccountingAccountOption[]
): AccountType {
  return allAccounts.find((account) => account.id === accountId)?.type ?? "unknown";
}

export function getAccountingDefaultValues(
  initialData: AccountingInitialData
): TourPackageQueryAccountingFormValues {
  if (!initialData) {
    return {
      purchaseDetails: [{ supplierId: "", purchaseDate: new Date(), price: 0, gstAmount: 0, gstPercentage: 0, description: "" }],
      saleDetails: [{ customerId: "", saleDate: new Date(), salePrice: 0, gstAmount: 0, gstPercentage: 0, description: "" }],
      paymentDetails: [{ paymentDate: new Date(), amount: 0, accountId: "", transactionId: "", note: "", supplierId: "" }],
      receiptDetails: [{ customerId: "", receiptDate: new Date(), amount: 0, accountId: "", note: "" }],
      expenseDetails: [{ expenseDate: new Date(), amount: 0, expenseCategory: "", accountId: "", description: "" }],
      incomeDetails: [{ incomeDate: new Date(), amount: 0, incomeCategory: "", accountId: "", description: "" }],
    };
  }

  return {
    purchaseDetails: initialData.purchaseDetails?.map((detail) => ({
      supplierId: detail.supplierId ?? "",
      purchaseDate: new Date(detail.purchaseDate),
      price: detail.price ?? 0,
      gstAmount: detail.gstAmount ?? 0,
      gstPercentage: detail.gstPercentage ?? 0,
      description: detail.description ?? "",
    })) ?? [],
    saleDetails: initialData.saleDetails?.map((detail) => ({
      customerId: detail.customerId ?? "",
      saleDate: new Date(detail.saleDate),
      salePrice: detail.salePrice ?? 0,
      gstAmount: detail.gstAmount ?? 0,
      gstPercentage: detail.gstPercentage ?? 0,
      description: detail.description ?? "",
    })) ?? [],
    paymentDetails: initialData.paymentDetails?.map((detail) => ({
      paymentDate: new Date(detail.paymentDate),
      amount: detail.amount ?? 0,
      accountId: detail.bankAccountId ?? detail.cashAccountId ?? "",
      transactionId: detail.transactionId ?? "",
      note: detail.note ?? "",
      supplierId: detail.supplierId ?? "",
    })) ?? [],
    receiptDetails: initialData.receiptDetails?.map((detail) => ({
      customerId: detail.customerId ?? "",
      receiptDate: new Date(detail.receiptDate),
      amount: detail.amount ?? 0,
      accountId: detail.bankAccountId ?? detail.cashAccountId ?? "",
      note: detail.note ?? "",
    })) ?? [],
    expenseDetails: initialData.expenseDetails?.map((detail) => ({
      expenseDate: new Date(detail.expenseDate),
      amount: detail.amount ?? 0,
      expenseCategory: detail.expenseCategoryId ?? "",
      accountId: detail.bankAccountId ?? detail.cashAccountId ?? "",
      description: detail.description ?? "",
    })) ?? [],
    incomeDetails: initialData.incomeDetails?.map((detail) => ({
      incomeDate: new Date(detail.incomeDate),
      amount: detail.amount ?? 0,
      incomeCategory: detail.incomeCategoryId ?? "",
      accountId: detail.bankAccountId ?? detail.cashAccountId ?? "",
      description: detail.description ?? "",
    })) ?? [],
  };
}

export function validateAccountingForm(data: TourPackageQueryAccountingFormValues): string[] {
  const errors: string[] = [];

  data.purchaseDetails.forEach((item, index) => {
    if (!item.supplierId) {
      errors.push(`Supplier is required in purchase detail #${index + 1}`);
    }
    if (item.price <= 0) {
      errors.push(`Price must be greater than 0 in purchase detail #${index + 1}`);
    }
  });

  data.saleDetails.forEach((item, index) => {
    if (!item.customerId) {
      errors.push(`Customer is required in sale detail #${index + 1}`);
    }
    if (item.salePrice <= 0) {
      errors.push(`Sale price must be greater than 0 in sale detail #${index + 1}`);
    }
  });

  data.paymentDetails.forEach((item, index) => {
    if (!item.accountId) {
      errors.push(`Account is required in payment detail #${index + 1}`);
    }
    if (item.amount <= 0) {
      errors.push(`Amount must be greater than 0 in payment detail #${index + 1}`);
    }
  });

  data.receiptDetails.forEach((item, index) => {
    if (!item.accountId) {
      errors.push(`Account is required in receipt detail #${index + 1}`);
    }
    if (item.amount <= 0) {
      errors.push(`Amount must be greater than 0 in receipt detail #${index + 1}`);
    }
  });

  data.expenseDetails.forEach((item, index) => {
    if (!item.expenseCategory) {
      errors.push(`Category is required in expense detail #${index + 1}`);
    }
    if (!item.accountId) {
      errors.push(`Account is required in expense detail #${index + 1}`);
    }
    if (item.amount <= 0) {
      errors.push(`Amount must be greater than 0 in expense detail #${index + 1}`);
    }
  });

  data.incomeDetails.forEach((item, index) => {
    if (!item.incomeCategory) {
      errors.push(`Category is required in income detail #${index + 1}`);
    }
    if (!item.accountId) {
      errors.push(`Account is required in income detail #${index + 1}`);
    }
    if (item.amount <= 0) {
      errors.push(`Amount must be greater than 0 in income detail #${index + 1}`);
    }
  });

  return errors;
}

export function buildAccountingSubmitPayload(
  data: TourPackageQueryAccountingFormValues,
  allAccounts: AccountingAccountOption[]
): AccountingSubmitPayload {
  return {
    ...data,
    paymentDetails: data.paymentDetails.map((detail) => ({
      ...detail,
      accountType: resolveAccountType(detail.accountId, allAccounts),
    })),
    receiptDetails: data.receiptDetails.map((detail) => ({
      ...detail,
      accountType: resolveAccountType(detail.accountId, allAccounts),
    })),
    expenseDetails: data.expenseDetails.map((detail) => ({
      ...detail,
      expenseCategoryId: detail.expenseCategory,
      accountType: resolveAccountType(detail.accountId, allAccounts),
    })),
    incomeDetails: data.incomeDetails.map((detail) => ({
      ...detail,
      incomeCategoryId: detail.incomeCategory,
      accountType: resolveAccountType(detail.accountId, allAccounts),
    })),
  };
}
