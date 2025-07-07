import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { FileCheck, ListChecks, FileText, AlertCircle, ScrollText, Ban } from "lucide-react";

// Import necessary UI components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PolicyField } from "./policy-fields";

// Define the props interface with a union type for control
interface PoliciesTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  form: any;
  useLocationDefaults: {
    inclusions: boolean;
    exclusions: boolean;
    importantNotes: boolean;
    paymentPolicy: boolean;
    usefulTip: boolean;
    cancellationPolicy: boolean;
    airlineCancellationPolicy: boolean;
    termsconditions: boolean;
    kitchenGroupPolicy: boolean;
  };
  onUseLocationDefaultsChange: (field: string, checked: boolean) => void;
}

const PoliciesTab: React.FC<PoliciesTabProps> = ({
  control,
  loading,
  form,
  useLocationDefaults,
  onUseLocationDefaultsChange
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Policies & Terms
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="inclusions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="inclusions" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <ListChecks className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Inclusions</span>
              <span className="sm:hidden">Inc.</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Notes & Tips</span>
              <span className="sm:hidden">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="cancellation" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cancellation</span>
              <span className="sm:hidden">Cancel</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <ScrollText className="h-3 w-3 sm:h-4 sm:w-4" />
              Terms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inclusions" className="space-y-4 sm:space-y-6 mt-4">
            <PolicyField
              form={form}
              name="inclusions"
              label="Inclusions"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.inclusions}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('inclusions', checked)}
              description="Items and services included in the package."
            />
            <PolicyField
              form={form}
              name="exclusions"
              label="Exclusions"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.exclusions}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('exclusions', checked)}
              description="Items and services not included in the package."
            />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 sm:space-y-6 mt-4">
            <PolicyField
              form={form}
              name="importantNotes"
              label="Important Notes"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.importantNotes}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('importantNotes', checked)}
              description="Critical information for travelers."
            />
            <PolicyField
              form={form}
              name="usefulTip"
              label="Useful Tips"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.usefulTip}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('usefulTip', checked)}
              description="Helpful suggestions and advice."
            />
          </TabsContent>

          <TabsContent value="cancellation" className="space-y-4 sm:space-y-6 mt-4">
            <PolicyField
              form={form}
              name="cancellationPolicy"
              label="General Cancellation Policy"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.cancellationPolicy}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('cancellationPolicy', checked)}
              description="Policy regarding cancellations."
            />
            <PolicyField
              form={form}
              name="airlineCancellationPolicy"
              label="Airline Cancellation Policy"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.airlineCancellationPolicy}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('airlineCancellationPolicy', checked)}
              description="Specific policy for airline cancellations."
            />
            <PolicyField
              form={form}
              name="kitchenGroupPolicy"
              label="Kitchen Group Policy"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.kitchenGroupPolicy}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('kitchenGroupPolicy', checked)}
              description="Policy regarding kitchen and dining group arrangements."
            />
          </TabsContent>

          <TabsContent value="terms" className="space-y-4 sm:space-y-6 mt-4">
            <PolicyField
              form={form}
              name="paymentPolicy"
              label="Payment Policy"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.paymentPolicy}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('paymentPolicy', checked)}
              description="Details about payment schedules and methods."
            />
            <PolicyField
              form={form}
              name="termsconditions"
              label="Terms and Conditions"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.termsconditions}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('termsconditions', checked)}
              description="Overall terms and conditions for the package."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PoliciesTab;
