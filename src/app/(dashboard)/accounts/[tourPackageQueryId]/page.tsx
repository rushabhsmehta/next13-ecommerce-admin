import React from "react";
import prismadb from "@/lib/prismadb";
import { TourPackageQueryAccountingForm } from "./components/accounts-form";
import { buildAccountingAccountOptions } from "./components/accounting-form-options";

const tourPackageQueryPage = async (
  props: {
    params: Promise<{ tourPackageQueryId: string }>
  }
) => {
  const params = await props.params;

  const [tourPackageQuery, suppliers, customers, bankAccounts, cashAccounts, expenseCategories, incomeCategories] = await Promise.all([
    prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId,
      },
      include: {
        purchaseDetails: {
          include: {
            supplier: true
          }
        },
        saleDetails: {
          include: {
            customer: true,
            items: true,
          }
        },
        paymentDetails: {
          include: {
            supplier: true
          }
        },
        receiptDetails: {
          include: {
            customer: true,
          }
        },
        expenseDetails: true,
        incomeDetails: true,
      }
    }),
    prismadb.supplier.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc"
      }
    }),
    prismadb.customer.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
      },
      orderBy: {
        name: "asc"
      }
    }),
    prismadb.bankAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        accountName: true,
        bankName: true,
      },
      orderBy: {
        accountName: "asc"
      }
    }),
    prismadb.cashAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        accountName: true,
      },
      orderBy: {
        accountName: "asc"
      }
    }),
    prismadb.expenseCategory.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc"
      }
    }),
    prismadb.incomeCategory.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc"
      }
    }),
  ]);

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TourPackageQueryAccountingForm
            initialData={tourPackageQuery}
            bootstrapData={{
              suppliers,
              customers,
              allAccounts: buildAccountingAccountOptions(bankAccounts, cashAccounts),
              expenseCategories,
              incomeCategories,
            }}
          />
        </div>
      </div>
    </>
  );
}

export default tourPackageQueryPage;
