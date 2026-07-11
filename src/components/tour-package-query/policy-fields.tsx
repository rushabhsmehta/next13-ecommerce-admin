import { useEffect, useState } from "react";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface PolicyFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description: string;
  loading: boolean;
  useDefaultsChecked: boolean;
  onUseDefaultsChange: (checked: boolean) => void;
}

function paragraphsToText(items: string[]): string {
  return items.filter((item) => String(item ?? "").trim()).join("\n\n");
}

function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export const PolicyField: React.FC<PolicyFieldProps> = ({
  form,
  name,
  label,
  description,
  loading,
  useDefaultsChecked,
  onUseDefaultsChange,
}) => {
  const watchedValue = form.watch(name);
  const policyItems = Array.isArray(watchedValue) ? watchedValue : [];
  const [text, setText] = useState(() => paragraphsToText(policyItems));

  useEffect(() => {
    setText(paragraphsToText(policyItems));
    // Sync when form values change from outside (defaults toggle, load, etc.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(policyItems)]);

  return (
    <FormItem>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={name}>
          <AccordionTrigger className="font-medium">
            {label} ({policyItems.length})
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FormDescription>
              {description} Separate paragraphs with a blank line.
            </FormDescription>

            <div className="flex items-center space-x-2">
              <Switch
                checked={useDefaultsChecked}
                onCheckedChange={onUseDefaultsChange}
                disabled={loading}
              />
              <FormLabel className="!m-0">Use location defaults</FormLabel>
            </div>

            <FormControl>
              <Textarea
                disabled={loading}
                value={text}
                rows={Math.min(16, Math.max(6, policyItems.length * 2 + 2))}
                className="min-h-[140px] leading-relaxed"
                placeholder="Write policy text as paragraphs. Separate paragraphs with a blank line."
                onChange={(e) => {
                  const next = e.target.value;
                  setText(next);
                  form.setValue(name, textToParagraphs(next), {
                    shouldDirty: true,
                  });
                }}
              />
            </FormControl>

            <FormMessage />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormItem>
  );
};
