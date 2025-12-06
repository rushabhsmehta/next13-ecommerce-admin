import { Heading } from "@/components/ui/heading";
import { AutoTourPackageBuilder } from "../components/auto-tour-package-builder";
import {
  AUTO_TOUR_PACKAGE_SYSTEM_PROMPT,
  AUTO_TOUR_PACKAGE_STARTER_PROMPTS,
} from "@/lib/ai/tour-package-instructions";

const AutoTourPackagePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Heading
          title="Auto Tour Package"
          description="Generate sales-ready itineraries with OpenAI and the Aagam playbook."
        />
        <AutoTourPackageBuilder
          instructions={AUTO_TOUR_PACKAGE_SYSTEM_PROMPT}
          starterPrompts={AUTO_TOUR_PACKAGE_STARTER_PROMPTS}
        />
      </div>
    </div>
  );
};

export default AutoTourPackagePage;
