import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import GstReport from "./components/gst-report";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default async function GstReportPage() {
 /*  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Fetch all purchase and sale details with tax information
  const purchases = await prismadb.purchaseDetail.findMany({
    include: {
      supplier: true,
      items: {
        include: {
          taxSlab: true,
        },
      },
    },
    orderBy: {
      purchaseDate: 'desc',
    },
  });

  const sales = await prismadb.saleDetail.findMany({
    include: {
      customer: true,
      items: {
        include: {
          taxSlab: true,
        },
      },
    },
    orderBy: {
      saleDate: 'desc',
    },
  });

  // Fetch all tax slabs for reference
  const taxSlabs = await prismadb.taxSlab.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      percentage: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">GST Report</h2>
          <Link href="/reports/profit">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Profit Report
            </Button>
          </Link>
        </div>
        <GstReport 
          purchases={purchases}
          sales={sales}
          taxSlabs={taxSlabs}
        />
      </div>
    </div>
  );
}
