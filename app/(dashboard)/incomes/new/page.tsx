"use client";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeForm } from "../components/income-form";

const NewIncomePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Create Income"
          description="Add a new income record"
        />
        <Separator />
        <IncomeForm initialData={null} />
      </div>
    </div>
  );
};

export default NewIncomePage;
