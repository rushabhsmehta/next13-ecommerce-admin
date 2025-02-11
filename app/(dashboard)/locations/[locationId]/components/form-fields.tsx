import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface FieldProps {
  control: Control<any>;
  loading: boolean;
}

export const LabelField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="label" render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter label" {...field} />
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
        <Textarea rows={3} disabled={loading} placeholder="Enter tags" {...field} />
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
        <Textarea rows={3} disabled={loading} placeholder="Enter slug" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const InclusionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="inclusions" render={({ field }) => (
    <FormItem>
      <FormLabel>Inclusions</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter inclusions" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const ExclusionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="exclusions" render={({ field }) => (
    <FormItem>
      <FormLabel>Exclusions</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter exclusions" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const ImportantNotesField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="importantNotes" render={({ field }) => (
    <FormItem>
      <FormLabel>Important Notes</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter important notes" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const PaymentPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="paymentPolicy" render={({ field }) => (
    <FormItem>
      <FormLabel>Payment Policy</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter payment policy" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const UsefulTipField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="usefulTip" render={({ field }) => (
    <FormItem>
      <FormLabel>Useful Tip</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter useful tip" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const CancellationPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="cancellationPolicy" render={({ field }) => (
    <FormItem>
      <FormLabel>Cancellation Policy</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter cancellation policy" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const AirlineCancellationPolicyField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="airlineCancellationPolicy" render={({ field }) => (
    <FormItem>
      <FormLabel>Airline Cancellation Policy</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter airline cancellation policy" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);

export const TermsConditionsField: React.FC<FieldProps> = ({ control, loading }) => (
  <FormField control={control} name="termsconditions" render={({ field }) => (
    <FormItem>
      <FormLabel>Terms and Conditions</FormLabel>
      <FormControl>
        <Textarea rows={3} disabled={loading} placeholder="Enter terms and conditions" {...field} style={{ width: '100%' }} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
);
