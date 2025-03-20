import prismadb from "@/lib/prismadb";
import { AssociatePartnerForm } from "./components/associate-partner-form";

const AssociatePartnerPage = async ({
  params
}: {
  params: { associatePartnerId: string }
}) => {
  let associatePartner = null;

  if (params.associatePartnerId !== "new") {
    associatePartner = await prismadb.associatePartner.findUnique({
      where: {
        id: params.associatePartnerId,
      }
    });
  }
  
  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AssociatePartnerForm initialData={associatePartner} />
      </div>
    </div>
  );
}

export default AssociatePartnerPage;
