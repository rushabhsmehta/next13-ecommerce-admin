import { useEffect, useState } from "react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface PolicyListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  loading: boolean;
  placeholder?: string;
}

function paragraphsToText(items: string[]): string {
  return (items || []).filter((item) => String(item ?? "").trim()).join("\n\n");
}

function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export const PolicyListField: React.FC<PolicyListFieldProps> = ({
  label,
  value = [],
  onChange,
  loading,
  placeholder = "Write policy text as paragraphs…",
}) => {
  const [text, setText] = useState(paragraphsToText(value));

  useEffect(() => {
    setText(paragraphsToText(value));
  }, [value]);

  return (
    <FormItem className="w-full">
      {label ? <FormLabel>{label}</FormLabel> : null}
      <p className="text-xs text-muted-foreground">
        Separate paragraphs with a blank line.
      </p>
      <FormControl>
        <Textarea
          disabled={loading}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            onChange(textToParagraphs(next));
          }}
          rows={8}
          className="min-h-[140px] leading-relaxed w-full"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
