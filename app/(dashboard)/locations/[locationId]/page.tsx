import prismadb from "@/lib/prismadb";

import { LocationForm } from "./components/location-form";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const LocationPage = async ({
  params
}: {
  params: { locationId: string }
}) => {
  const location = await prismadb.location.findUnique({
    where: {
      id: params.locationId
    }
  });

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <LocationForm initialData={location} />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default LocationPage;
