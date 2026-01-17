import { AIPackageWizard } from "@/components/ai/ai-package-wizard";
import { Heading } from "@/components/ui/heading";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

const AIQueryWizardPage = async () => {
    // Fetch locations for the combobox
    const locations = await prismadb.location.findMany({
        where: { isActive: true },
        select: { id: true, label: true },
        orderBy: { label: "asc" },
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="text-center max-w-2xl mx-auto mb-8">
                    <Heading
                        title="AI Query Wizard ✨"
                        description="Generate personalized quotations for your clients. Fill in the details and let AI create a compelling proposal."
                    />
                </div>
                <AIPackageWizard locations={locations} mode="tourPackageQuery" />
            </div>
        </div>
    );
};

export default AIQueryWizardPage;
