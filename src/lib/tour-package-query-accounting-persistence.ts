import { resolveAccountingAccountFields } from "./tour-package-query-accounting-helpers";
import type { TourPackageQueryAccountingPayload } from "./tour-package-query-accounting-schema";

type PrismaModel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteMany: (args: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (args: any) => Promise<Record<string, unknown>>;
};

type AccountingPrismaClient = {
  purchaseItem: PrismaModel;
  purchaseDetail: PrismaModel;
  saleItem: PrismaModel;
  saleDetail: PrismaModel;
  paymentDetail: PrismaModel;
  receiptDetail: PrismaModel;
  expenseDetail: PrismaModel;
  incomeDetail: PrismaModel;
};

type ReplaceTourPackageQueryAccountingDependencies = {
  prismadb: AccountingPrismaClient;
  dateToUtc: (value?: string | Date | null, timezone?: string) => Date | undefined;
};

function toNumber(value: number | string): number {
  return parseFloat(value.toString());
}

function toOptionalNumber(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parseFloat(value.toString());
}

export async function replaceTourPackageQueryAccountingWithDependencies(
  dependencies: ReplaceTourPackageQueryAccountingDependencies,
  tourPackageQueryId: string,
  payload: TourPackageQueryAccountingPayload
) {
  const { prismadb, dateToUtc } = dependencies;
  const {
    purchaseDetails,
    saleDetails,
    paymentDetails,
    receiptDetails,
    expenseDetails,
    incomeDetails,
  } = payload;

  if (purchaseDetails && Array.isArray(purchaseDetails)) {
    await prismadb.purchaseItem.deleteMany({
      where: {
        purchaseDetail: {
          tourPackageQueryId,
        },
      },
    });

    await prismadb.purchaseDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const purchaseDetail of purchaseDetails) {
      const createdPurchaseDetail = await prismadb.purchaseDetail.create({
        data: {
          tourPackageQueryId,
          supplierId: purchaseDetail.supplierId || null,
          purchaseDate: dateToUtc(purchaseDetail.purchaseDate)!,
          billNumber: purchaseDetail.billNumber || null,
          billDate: dateToUtc(purchaseDetail.billDate),
          dueDate: dateToUtc(purchaseDetail.dueDate),
          stateOfSupply: purchaseDetail.stateOfSupply || null,
          referenceNumber: purchaseDetail.referenceNumber || null,
          price: toNumber(purchaseDetail.price),
          gstAmount: toOptionalNumber(purchaseDetail.gstAmount),
          gstPercentage: toOptionalNumber(purchaseDetail.gstPercentage),
          description: purchaseDetail.description || null,
          status: purchaseDetail.status || "pending",
        },
      });

      if (purchaseDetail.items && Array.isArray(purchaseDetail.items)) {
        for (const item of purchaseDetail.items) {
          await prismadb.purchaseItem.create({
            data: {
              purchaseDetailId: createdPurchaseDetail.id,
              productName: item.productName,
              description: item.description || null,
              quantity: toNumber(item.quantity),
              unitOfMeasureId: item.unitOfMeasureId || null,
              pricePerUnit: toNumber(item.pricePerUnit),
              taxSlabId: item.taxSlabId || null,
              taxAmount: toOptionalNumber(item.taxAmount),
              totalAmount: toNumber(item.totalAmount),
            },
          });
        }
      }
    }
  }

  if (saleDetails && Array.isArray(saleDetails)) {
    await prismadb.saleItem.deleteMany({
      where: {
        saleDetail: {
          tourPackageQueryId,
        },
      },
    });

    await prismadb.saleDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const saleDetail of saleDetails) {
      const createdSaleDetail = await prismadb.saleDetail.create({
        data: {
          tourPackageQueryId,
          customerId: saleDetail.customerId || null,
          saleDate: dateToUtc(saleDetail.saleDate)!,
          invoiceNumber: saleDetail.invoiceNumber || null,
          invoiceDate: dateToUtc(saleDetail.invoiceDate),
          dueDate: dateToUtc(saleDetail.dueDate),
          stateOfSupply: saleDetail.stateOfSupply || null,
          salePrice: toNumber(saleDetail.salePrice),
          gstAmount: toOptionalNumber(saleDetail.gstAmount),
          gstPercentage: toOptionalNumber(saleDetail.gstPercentage),
          description: saleDetail.description || null,
          status: saleDetail.status || "pending",
        },
      });

      if (saleDetail.items && Array.isArray(saleDetail.items)) {
        for (const item of saleDetail.items) {
          await prismadb.saleItem.create({
            data: {
              saleDetailId: createdSaleDetail.id,
              productName: item.productName,
              description: item.description || null,
              quantity: toNumber(item.quantity),
              unitOfMeasureId: item.unitOfMeasureId || null,
              pricePerUnit: toNumber(item.pricePerUnit),
              taxSlabId: item.taxSlabId || null,
              taxAmount: toOptionalNumber(item.taxAmount),
              totalAmount: toNumber(item.totalAmount),
            },
          });
        }
      }
    }
  }

  if (paymentDetails && Array.isArray(paymentDetails)) {
    await prismadb.paymentDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const paymentDetail of paymentDetails) {
      const accountFields = resolveAccountingAccountFields(paymentDetail);

      await prismadb.paymentDetail.create({
        data: {
          tourPackageQueryId,
          supplierId: paymentDetail.supplierId || null,
          paymentDate: dateToUtc(paymentDetail.paymentDate)!,
          amount: toNumber(paymentDetail.amount),
          method: paymentDetail.method || null,
          transactionId: paymentDetail.transactionId || null,
          note: paymentDetail.note || null,
          ...accountFields,
        },
      });
    }
  }

  if (receiptDetails && Array.isArray(receiptDetails)) {
    await prismadb.receiptDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const receiptDetail of receiptDetails) {
      const accountFields = resolveAccountingAccountFields(receiptDetail);

      await prismadb.receiptDetail.create({
        data: {
          tourPackageQueryId,
          customerId: receiptDetail.customerId || null,
          receiptDate: dateToUtc(receiptDetail.receiptDate)!,
          amount: toNumber(receiptDetail.amount),
          reference: receiptDetail.reference || null,
          note: receiptDetail.note || null,
          ...accountFields,
        },
      });
    }
  }

  if (expenseDetails && Array.isArray(expenseDetails)) {
    await prismadb.expenseDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const expenseDetail of expenseDetails) {
      const accountFields = resolveAccountingAccountFields(expenseDetail);

      await prismadb.expenseDetail.create({
        data: {
          tourPackageQueryId,
          expenseDate: dateToUtc(expenseDetail.expenseDate)!,
          amount: toNumber(expenseDetail.amount),
          expenseCategoryId: expenseDetail.expenseCategoryId || null,
          description: expenseDetail.description || null,
          ...accountFields,
        },
      });
    }
  }

  if (incomeDetails && Array.isArray(incomeDetails)) {
    await prismadb.incomeDetail.deleteMany({
      where: {
        tourPackageQueryId,
      },
    });

    for (const incomeDetail of incomeDetails) {
      const accountFields = resolveAccountingAccountFields(incomeDetail);

      await prismadb.incomeDetail.create({
        data: {
          tourPackageQueryId,
          incomeDate: dateToUtc(incomeDetail.incomeDate)!,
          amount: toNumber(incomeDetail.amount),
          incomeCategoryId: incomeDetail.incomeCategoryId || null,
          description: incomeDetail.description || null,
          ...accountFields,
        },
      });
    }
  }
}
