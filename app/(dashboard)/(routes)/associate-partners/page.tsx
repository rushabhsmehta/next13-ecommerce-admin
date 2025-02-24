import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { AssociatePartnersClient } from "./components/client";
import { AssociatePartnerColumn } from "./components/columns";

const AssociatePartnersPage = async () => {
  const associatePartners = await prismadb.associatePartner.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedAssociatePartners: AssociatePartnerColumn[] = associatePartners.map((item) => ({
    id: item.id,
    name: item.name,
    mobileNumber: item.mobileNumber,
    email: item.email || '',
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AssociatePartnersClient data={formattedAssociatePartners} />
      </div>
    </div>
  );
}

export default AssociatePartnersPage;
