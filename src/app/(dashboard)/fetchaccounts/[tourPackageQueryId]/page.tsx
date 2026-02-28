import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import TourPackageQueryDisplay from "./components/fetchaccounts";

interface TourPackageQueryPageProps {
  params: {
    tourPackageQueryId: string;
  };
}

const TourPackageQueryPage: React.FC<TourPackageQueryPageProps> = async props => {
  const params = await props.params;
  /*  const { userId } = await auth();

   if (!userId) {
     redirect("/sign-in");
   } */
  // Fetch the tour package query with all related data
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      purchaseDetails: {
        select: {
          id: true,
          purchaseDate: true,
          price: true,
          gstAmount: true,
          gstPercentage: true,
          description: true,
          supplierId: true,
          billNumber: true,
          referenceNumber: true,
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          items: true, // Include purchase items for the full data needed in edit forms
          purchaseReturns: {
            include: {
              items: true
            }
          }
        },
        orderBy: {
          purchaseDate: 'asc', // Show oldest first
        },
      },
      saleDetails: {
        select: {
          id: true,
          saleDate: true,
          salePrice: true,
          gstAmount: true,
          gstPercentage: true,
          description: true,
          customerId: true,
          invoiceNumber: true,
          customer: {
            select: {
              id: true,
              name: true
            }          },
          items: true, // Include sale items for the full data needed in edit forms
          saleReturns: {
            include: {
              items: true
            }
          }
        },
        orderBy: {
          saleDate: 'asc', // Show oldest first
        },
      },      paymentDetails: {
        select: {
          id: true,
          paymentDate: true,
          amount: true,
          method: true,
          transactionId: true,
          note: true,
          supplierId: true,
          customerId: true,
          paymentType: true,
          bankAccountId: true,
          cashAccountId: true,
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              contact: true
            }
          },
          images: {
            select: {
              url: true
            }
          },
        },
        orderBy: {
          paymentDate: 'asc', // Show oldest first
        },
      },      receiptDetails: {
        select: {
          id: true,
          receiptDate: true,
          amount: true,
          reference: true,
          note: true,
          customerId: true,
          supplierId: true,
          receiptType: true,
          bankAccountId: true,
          cashAccountId: true,
          customer: {
            select: {
              id: true,
              name: true,
              contact: true
            }
          },
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true
            }
          },
          images: {
            select: {
              url: true
            }
          },
        },
        orderBy: {
          receiptDate: 'asc', // Show oldest first
        },
      },
      expenseDetails: {
        select: {
          id: true,
          expenseDate: true,
          amount: true,
          description: true,
          expenseCategoryId: true,
          bankAccountId: true,
          cashAccountId: true,
          expenseCategory: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          expenseDate: 'asc', // Show oldest first
        },
      },
      incomeDetails: {
        select: {
          id: true,
          incomeDate: true,
          amount: true,
          description: true,
          incomeCategoryId: true,
          bankAccountId: true,
          cashAccountId: true,
          incomeCategory: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          incomeDate: 'asc', // Show oldest first
        },
      },
    },
  });

  if (!tourPackageQuery) {
    redirect("/inquiries");
  }

  // Fetch reference data for forms
  const [taxSlabs, units, suppliers, customers, bankAccounts, cashAccounts, expenseCategories, incomeCategories] = await Promise.all([
    prismadb.taxSlab.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prismadb.unitOfMeasure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prismadb.supplier.findMany({
      orderBy: { name: 'asc' },
    }),
    prismadb.customer.findMany({
      orderBy: { name: 'asc' },
    }),
    prismadb.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { accountName: 'asc' },
    }),
    prismadb.cashAccount.findMany({
      where: { isActive: true },
      orderBy: { accountName: 'asc' },
    }),
    prismadb.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prismadb.incomeCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),

  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryDisplay 
          initialData={tourPackageQuery as any} // Use type assertion to avoid the complex typing issue
          taxSlabs={taxSlabs}
          units={units}
          suppliers={suppliers}
          customers={customers}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
        />
      </div>
    </div>
  );
};

export default TourPackageQueryPage;
