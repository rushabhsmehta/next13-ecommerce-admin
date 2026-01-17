import { AIPackageWizard } from "@/components/ai/ai-package-wizard";
import { Heading } from "@/components/ui/heading";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

const AIPackageWizardPage = async () => {
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
                        title="AI Package Wizard ✨"
                        description="Create stunning tour packages in seconds. Fill in the details and let AI craft a personalized itinerary."
                    />
                </div>
                <AIPackageWizard locations={locations} mode="tourPackage" />
            </div>
        </div>
    );
};

export default AIPackageWizardPage;
