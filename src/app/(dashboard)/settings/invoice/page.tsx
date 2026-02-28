import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { InvoiceSettingsForm } from "./components/invoice-settings-form";

const InvoiceSettingsPage = async () => {
  // Get organization settings with invoice information
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Invoice Settings"
          description="Configure your invoice and bill numbering"
        />
        <Separator />
        <InvoiceSettingsForm initialData={organization} />
      </div>
    </div>
  );
};

export default InvoiceSettingsPage;

