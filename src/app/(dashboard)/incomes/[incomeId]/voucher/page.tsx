import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface IncomeVoucherPageProps {
  params: Promise<{
    incomeId: string;
  }>;
}

const IncomeVoucherPage = async (props: IncomeVoucherPageProps) => {
  const params = await props.params;
  // Get income details with related data
  const income = await prismadb.incomeDetail.findUnique({
    where: { id: params.incomeId },
    include: {
      tourPackageQuery: true,
      incomeCategory: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!income) {
    return notFound();
  }
  // Format the income date
  const formattedDate = formatLocalDate(income.incomeDate, "MMMM d, yyyy");

  // Determine payment method and account details
  const paymentMethod = income.bankAccount 
    ? `Bank - ${income.bankAccount.accountName}`
    : income.cashAccount
    ? `Cash - ${income.cashAccount.accountName}`
    : "Unknown";

  // Get the organization for the voucher header
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Description text for table
  const description = income.tourPackageQuery?.tourPackageQueryName 
    ? `Income from ${income.tourPackageQuery.tourPackageQueryName}` 
    : income.description || "General Income";

  // Prepare data for voucher layout
  const voucherData = {
    title: "INCOME VOUCHER",
    subtitle: income.incomeCategory?.name || "Income Receipt",
    voucherNo: `INC-${income.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    leftInfo: [
      { 
        label: "CATEGORY", 
        content: (
          <div>
            <p className="font-medium">{income.incomeCategory?.name || "Uncategorized"}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      { label: "Source", content: income.tourPackageQuery ? "Tour Package" : "Other" }
    ],
    tableHeaders: ["Description", "Payment Method", "Amount"],
    tableRows: [(
      <tr key={income.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4">{paymentMethod}</td>
        <td className="py-4 px-4 text-right">{formatPrice(income.amount)}</td>
      </tr>
    )],
    totalAmount: income.amount,
    additionalNotes: income.description || "Income recorded in accounting system.",
    signatures: { left: "Recorded By", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Income Voucher" 
            description="View and print income voucher"
          />
          <VoucherActions id={params.incomeId} type="income" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="income"
          organization={organization}
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default IncomeVoucherPage;
