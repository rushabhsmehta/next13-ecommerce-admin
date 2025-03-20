import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { OrganizationForm } from "./components/organization-form";
import prismadb from "@/lib/prismadb";

const OrganizationPage = async () => {
  // Get organization settings or create default if not exists
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Organization Settings"
          description="Manage your organization details"
        />
        <Separator />
        <OrganizationForm initialData={organization} />
      </div>
    </div>
  );
};

export default OrganizationPage;

