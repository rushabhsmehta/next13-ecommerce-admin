// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\policy-fields.tsx
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";

interface PolicyFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description: string;
  loading: boolean;
  useDefaultsChecked: boolean;
  onUseDefaultsChange: (checked: boolean) => void;
}

export const PolicyField: React.FC<PolicyFieldProps> = ({  form,
  name,
  label,
  description,
  loading,
  useDefaultsChecked,
  onUseDefaultsChange,
}) => {
  const watchedValue = form.watch(name);
  // Ensure policyItems is always an array
  const policyItems = Array.isArray(watchedValue) ? watchedValue : [];
  const [newPolicyItem, setNewPolicyItem] = useState('');

  const handleAddPolicyItem = () => {
    if (!newPolicyItem.trim()) return;
    const updatedPolicyItems = [...policyItems, newPolicyItem];
    form.setValue(name, updatedPolicyItems);
    setNewPolicyItem('');
  };

  const handleRemovePolicyItem = (index: number) => {
    const updatedPolicyItems = [...policyItems];
    updatedPolicyItems.splice(index, 1);
    form.setValue(name, updatedPolicyItems);
  };

  return (
    <FormItem>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={name}>
          <AccordionTrigger className="font-medium">
            {label} ({policyItems.length})
          </AccordionTrigger>          <AccordionContent className="space-y-4">
            <FormDescription>
              {description}
            </FormDescription>
            
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                checked={useDefaultsChecked} 
                onCheckedChange={onUseDefaultsChange}
                disabled={loading}
              />
              <FormLabel className="!m-0 text-sm">Use location defaults</FormLabel>
            </div>
            
            <div className="space-y-3">
              {policyItems.map((item: string, index: number) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <FormControl className="w-full">
                    <Input 
                      disabled={loading}
                      value={item}
                      className="flex-1"
                      onChange={(e) => {
                        const updatedItems = [...policyItems];
                        updatedItems[index] = e.target.value;
                        form.setValue(name, updatedItems);
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="shrink-0"
                    disabled={loading}
                    onClick={() => handleRemovePolicyItem(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-4">
              <FormControl className="w-full">
                <Input
                  disabled={loading}
                  placeholder="Add new item..."
                  value={newPolicyItem}
                  className="flex-1"
                  onChange={(e) => setNewPolicyItem(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPolicyItem();
                    }
                  }}
                />
              </FormControl>              <Button
                type="button"
                size="sm"
                disabled={loading || !newPolicyItem.trim()}
                onClick={handleAddPolicyItem}
                className="shrink-0 h-9 px-3"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
            
            <FormMessage />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormItem>
  );
};
