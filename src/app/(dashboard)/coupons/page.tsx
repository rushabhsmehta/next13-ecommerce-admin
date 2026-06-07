import prismadb from "@/lib/prismadb";
import { COUPONS_ENABLED } from "@/lib/coupons";
import { CouponsClient } from "./components/client";

export default async function CouponsPage() {
  if (!COUPONS_ENABLED) {
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-2 p-4 pt-4 md:p-8 md:pt-6">
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-sm text-muted-foreground">
            Coupon management is disabled by COUPONS_ENABLED.
          </p>
        </div>
      </div>
    );
  }

  const [campaigns, locations, tourPackages] = await Promise.all([
    (prismadb as any).couponCampaign.findMany({
      include: {
        codes: { orderBy: { createdAt: "asc" } },
        redemptions: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            inquiry: { select: { id: true, customerName: true } },
            tourPackageQuery: {
              select: {
                id: true,
                tourPackageQueryName: true,
                tourPackageQueryNumber: true,
              },
            },
            saleDetail: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prismadb.location.findMany({
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prismadb.tourPackage.findMany({
      where: { isArchived: false },
      select: { id: true, tourPackageName: true, tourCategory: true },
      orderBy: { tourPackageName: "asc" },
      take: 200,
    }),
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <CouponsClient
          initialCampaigns={JSON.parse(JSON.stringify(campaigns))}
          locations={locations}
          tourPackages={tourPackages}
        />
      </div>
    </div>
  );
}
