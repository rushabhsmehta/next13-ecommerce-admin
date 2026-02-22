import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface ExpenseVoucherPageProps {
  params: Promise<{
    expenseId: string;
  }>;
}

const ExpenseVoucherPage = async (props: ExpenseVoucherPageProps) => {
  const params = await props.params;
  // Get expense details with related data
  const expense = await prismadb.expenseDetail.findUnique({
    where: { id: params.expenseId },
    include: {
      tourPackageQuery: true,
      expenseCategory: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!expense) {
    return notFound();
  }

  // Format the expense date
  const formattedDate = format(expense.expenseDate, "MMMM d, yyyy");

  // Determine payment method and account details
  const paymentMethod = expense.bankAccount 
    ? `Bank - ${expense.bankAccount.accountName}`
    : expense.cashAccount
    ? `Cash - ${expense.cashAccount.accountName}`
    : "Unknown";

  // Get the organization for the voucher header
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Description text for table
  const description = expense.tourPackageQuery?.tourPackageQueryName 
    ? `Expense for ${expense.tourPackageQuery.tourPackageQueryName}` 
    : expense.description || "General Expense";

  // Prepare data for voucher layout
  const voucherData = {
    title: "EXPENSE VOUCHER",
    subtitle: expense.expenseCategory?.name || "Expense Payment",
    voucherNo: `EXP-${expense.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    leftInfo: [
      { 
        label: "CATEGORY", 
        content: (
          <div>
            <p className="font-medium">{expense.expenseCategory?.name || "Uncategorized"}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      { 
        label: "DETAILS",
        content: expense.tourPackageQuery ? (
          <div>
            <p>Related to: {expense.tourPackageQuery.tourPackageQueryName || "Tour Package"}</p>
          </div>
        ) : "General Expense"
      }
    ],
    tableHeaders: ["Description", "Payment Method", "Amount"],
    tableRows: [(
      <tr key={expense.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4">{paymentMethod}</td>
        <td className="py-4 px-4 text-right">{formatPrice(expense.amount)}</td>
      </tr>
    )],
    totalAmount: expense.amount,
    additionalNotes: expense.description || "Expense recorded in accounting system.",
    signatures: { left: "Prepared By", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Expense Voucher" 
            description="View and print expense voucher"
          />
          <VoucherActions id={params.expenseId} type="expense" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="expense"
          organization={organization}
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default ExpenseVoucherPage;
