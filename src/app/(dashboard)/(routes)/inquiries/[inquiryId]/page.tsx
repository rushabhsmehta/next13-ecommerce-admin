import prismadb from "@/lib/prismadb";
import { InquiryForm } from "./components/inquiry-form";
import { InquiryStaffAssignmentWrapper } from "@/components/InquiryStaffAssignmentWrapper";

const InquiryPage = async ({
  params
}: {
  params: { inquiryId: string }
}) => {
  const inquiry = await prismadb.inquiry.findUnique({
    where: {
      id: params.inquiryId
    },
    include: {
      location: true,
      associatePartner: true,
      roomAllocations: {
        include: {
          roomType: true,
          occupancyType: true,
          mealPlan: true
        }
      },
      transportDetails: {
        include: {
          vehicleType: true
        }
      },
      actions: {
        orderBy: {
          actionDate: 'desc'
        }
      }
    }
  });
  const locations = await prismadb.location.findMany();
  const associates = await prismadb.associatePartner.findMany();
  const roomTypes = await prismadb.roomType.findMany();
  const occupancyTypes = await prismadb.occupancyType.findMany();
  const mealPlans = await prismadb.mealPlan.findMany();
  const vehicleTypes = await prismadb.vehicleType.findMany();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InquiryForm
          initialData={inquiry}
          locations={locations}
          associates={associates}
          actions={inquiry?.actions || []}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
          vehicleTypes={vehicleTypes}
        />

        {/* Staff Assignment Section */}
        {inquiry && (
          <div className="mt-6 border rounded-md shadow-sm p-4 bg-card">
            <h3 className="text-lg font-medium mb-4">Operational Staff Assignment</h3>
            <InquiryStaffAssignmentWrapper
              inquiryId={inquiry.id}
              assignedStaffId={inquiry.assignedToStaffId || null}
              assignedStaffAt={inquiry.assignedStaffAt?.toISOString() || null}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default InquiryPage;
