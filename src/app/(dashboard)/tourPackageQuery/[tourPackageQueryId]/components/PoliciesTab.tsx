// filepath: d:\next13-ecommerce-admin\src\app\(dashboard)\tourPackageQuery\[tourPackageQueryId]\components\PoliciesTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { FileCheck, ListChecks, FileText, AlertCircle, ScrollText } from "lucide-react";

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

// Define the props interface
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Policies & Terms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inclusions" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="inclusions">
              <ListChecks className="h-4 w-4 mr-2" />
              Inclusions
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 mr-2" />
              Notes & Tips
            </TabsTrigger>
            <TabsTrigger value="cancellation" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              Cancellation
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 mr-2" />
              Terms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inclusions" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <PolicyField
                form={form}
                name="inclusions"
                label="Inclusions"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.inclusions}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('inclusions', checked)}
                description="Inclusions for this tour package"
              />

              <PolicyField
                form={form}
                name="exclusions"
                label="Exclusions"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.exclusions}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('exclusions', checked)}
                description="Exclusions for this tour package"
              />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <PolicyField
                form={form}
                name="importantNotes"
                label="Important Notes"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.importantNotes}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('importantNotes', checked)}
                description="Important notes for this tour package"
              />

              <PolicyField
                form={form}
                name="usefulTip"
                label="Useful Tips"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.usefulTip}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('usefulTip', checked)}
                description="Useful tips for this tour package"
              />
            </div>
          </TabsContent>

          <TabsContent value="cancellation" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <PolicyField
                form={form}
                name="cancellationPolicy"
                label="General Cancellation Policy"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.cancellationPolicy}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('cancellationPolicy', checked)}
                description="Cancellation policy for this tour package"
              />

              <PolicyField
                form={form}
                name="airlineCancellationPolicy"
                label="Airline Cancellation Policy"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.airlineCancellationPolicy}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('airlineCancellationPolicy', checked)}
                description="Airline cancellation policy for this tour package"
              />
            </div>
          </TabsContent>

          <TabsContent value="terms" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <PolicyField
                form={form}
                name="paymentPolicy"
                label="Payment Policy"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.paymentPolicy}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('paymentPolicy', checked)}
                description="Payment policy for this tour package"
              />

              <PolicyField
                form={form}
                name="termsconditions"
                label="Terms and Conditions"
                loading={loading}
                useDefaultsChecked={useLocationDefaults.termsconditions}
                onUseDefaultsChange={(checked: boolean) => onUseLocationDefaultsChange('termsconditions', checked)}
                description="Terms and conditions for this tour package"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PoliciesTab;
