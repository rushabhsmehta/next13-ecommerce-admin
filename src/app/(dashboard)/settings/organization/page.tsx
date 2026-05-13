import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { OrganizationForm } from "./components/organization-form";
import { OrganizationMembersSection } from "./components/organization-members-section";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

const OrganizationPage = async () => {
  const { userId } = await auth();

  // Get organization settings or create default if not exists
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  const orgRole = userId && organization?.id
    ? await getUserOrgRole(userId, organization.id)
    : userId
      ? await getUserOrgRole(userId)
      : null;
  const canManageOrgMembers = roleAtLeast(orgRole, "ADMIN");

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Organization Settings"
          description="Manage your organization details"
        />
        <Separator />
        <OrganizationForm initialData={organization} />
        {organization?.id && canManageOrgMembers ? (
          <>
            <Separator className="my-8" />
            <OrganizationMembersSection organizationId={organization.id} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default OrganizationPage;

