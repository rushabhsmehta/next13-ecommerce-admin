
import { Heading } from "@/components/ui/heading";
import { AutoQueryBuilder } from "../components/auto-query-builder";
import {
    AUTO_QUERY_SYSTEM_PROMPT,
    AUTO_QUERY_STARTER_PROMPTS,
} from "@/lib/ai/tour-package-instructions";

const AutoQueryPage = () => {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-6 p-8 pt-6">
                <Heading
                    title="Auto Query Builder"
                    description="Draft personalized quotations for client inquiries instantly using AI."
                />
                <AutoQueryBuilder
                    instructions={AUTO_QUERY_SYSTEM_PROMPT}
                    starterPrompts={AUTO_QUERY_STARTER_PROMPTS}
                />
            </div>
        </div>
    );
};

export default AutoQueryPage;
