import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import { PolicyListField } from "./policy-list-field";

interface FieldProps {
  control: Control<any>;
  loading: boolean;
}

export const LabelField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="label" render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input disabled={loading} placeholder="Enter label" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const TagsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="tags" render={({ field }) => (
    <FormItem>
      <FormLabel>Tags</FormLabel>
      <FormControl>
        <Textarea rows={6} disabled={loading} placeholder="Enter tags" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const SlugField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="slug" render={({ field }) => (
    <FormItem>
      <FormLabel>Slug</FormLabel>
      <FormControl>
        <Input disabled placeholder="Enter slug" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const InclusionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="inclusions" render={({ field }) => (
    <PolicyListField
      label="Inclusions"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add inclusion paragraph..."
    />
  )} />
);

export const ExclusionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="exclusions" render={({ field }) => (
    <PolicyListField
      label="Exclusions"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add exclusion paragraph..."
    />
  )} />
);

export const ImportantNotesField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="importantNotes" render={({ field }) => (
    <PolicyListField
      label="Important Notes"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add important note paragraph..."
    />
  )} />
);

export const PaymentPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="paymentPolicy" render={({ field }) => (
    <PolicyListField
      label="Payment Policy"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add payment policy paragraph..."
    />
  )} />
);

export const UsefulTipField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="usefulTip" render={({ field }) => (
    <PolicyListField
      label="Useful Tips"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add useful tip paragraph..."
    />
  )} />
);

export const CancellationPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="cancellationPolicy" render={({ field }) => (
    <PolicyListField
      label="Cancellation Policy"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add cancellation policy paragraph..."
    />
  )} />
);

export const AirlineCancellationPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="airlineCancellationPolicy" render={({ field }) => (
    <PolicyListField
      label="Airline Cancellation Policy"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add airline cancellation policy paragraph..."
    />
  )} />
);

export const TermsConditionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="termsconditions" render={({ field }) => (
    <PolicyListField
      label="Terms and Conditions"
      value={field.value || []}
      onChange={field.onChange}
      loading={loading}
      placeholder="Add terms and conditions paragraph..."
    />
  )} />
);
