// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\PoliciesTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed
import { FileCheck, ListChecks, FileText, AlertCircle, ScrollText, Ban } from "lucide-react"; // Added Ban icon

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
  control: Control<TourPackageQueryFormValues | TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  form: any; // Consider using a more specific type or a union type if form methods differ
  useLocationDefaults: {
    inclusions: boolean;
    exclusions: boolean;
    importantNotes: boolean;
    paymentPolicy: boolean;
    usefulTip: boolean;
    cancellationPolicy: boolean;
    airlineCancellationPolicy: boolean;
    termsconditions: boolean;
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
    <Card>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Policies & Terms
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="inclusions" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto mb-6">
            <TabsTrigger value="inclusions" className="flex items-center gap-1.5 py-2">
              <ListChecks className="h-4 w-4" />
              Inclusions
            </TabsTrigger>
            <TabsTrigger value="exclusions" className="flex items-center gap-1.5 py-2">
              <Ban className="h-4 w-4" /> {/* Added Exclusions Icon */}
              Exclusions
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1.5 py-2">
              <FileText className="h-4 w-4" />
              Notes & Tips
            </TabsTrigger>
            {/* <TabsTrigger value="cancellation" className="flex items-center gap-1.5 py-2">
              <AlertCircle className="h-4 w-4" />
              Cancellation
            </TabsTrigger> */}
            <TabsTrigger value="terms" className="flex items-center gap-1.5 py-2">
              <ScrollText className="h-4 w-4" />
              Policies & Terms
            </TabsTrigger>
          </TabsList>

          {/* Inclusions Tab */}
          <TabsContent value="inclusions" className="space-y-6 mt-4">
            <PolicyField
              form={form}
              name="inclusions"
              label="Inclusions"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.inclusions}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('inclusions', checked)}
              description="What is included in this tour package."
            />
          </TabsContent>

          {/* Exclusions Tab */}
          <TabsContent value="exclusions" className="space-y-6 mt-4">
            <PolicyField
              form={form}
              name="exclusions"
              label="Exclusions"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.exclusions}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('exclusions', checked)}
              description="What is NOT included in this tour package."
            />
          </TabsContent>

          {/* Notes & Tips Tab */}
          <TabsContent value="notes" className="space-y-6 mt-4">
            <PolicyField
              form={form}
              name="importantNotes"
              label="Important Notes"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.importantNotes}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('importantNotes', checked)}
              description="Crucial information for the traveler."
            />
            <PolicyField
              form={form}
              name="usefulTip"
              label="Useful Tips"
              loading={loading}
              useDefaultsChecked={useLocationDefaults.usefulTip}
              onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('usefulTip', checked)}
              description="Helpful suggestions for the trip."
            />
          </TabsContent>

          {/* Cancellation Tab - Combined into Terms */}
          {/* <TabsContent value="cancellation" className="space-y-6 mt-4">
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
          </TabsContent> */}

          {/* Terms & Policies Tab */}
          <TabsContent value="terms" className="space-y-6 mt-4">
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
