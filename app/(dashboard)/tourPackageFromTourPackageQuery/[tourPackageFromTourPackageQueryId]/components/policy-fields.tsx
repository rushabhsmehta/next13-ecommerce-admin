import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { PolicyListField } from "./policy-list-field";
import { Switch } from "@/components/ui/switch";

interface PolicyFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  loading: boolean;
  placeholder?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  switchDescription?: string;
}

export const PolicyField: React.FC<PolicyFieldProps> = ({
  control,
  name,
  label,
  loading,
  placeholder,
  checked = false,
  onCheckedChange,
  switchDescription = "Use Location Defaults"
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <div className="flex items-center space-x-3">
          <FormLabel>{label}</FormLabel>
          {onCheckedChange && (
            <Switch 
              checked={checked} 
              onCheckedChange={onCheckedChange} 
            />
          )}
        </div>
        {onCheckedChange && (
          <FormDescription>{switchDescription}</FormDescription>
        )}
        <FormControl>
          <PolicyListField
            label=""
            value={field.value || []}
            onChange={field.onChange}
            loading={loading}
            placeholder={placeholder || `Add ${label.toLowerCase()} item...`}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
