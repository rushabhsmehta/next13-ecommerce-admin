import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PolicyListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  loading?: boolean;
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
  value,
  onChange,
  loading,
  placeholder,
}) => {
  const [text, setText] = useState(paragraphsToText(value || []));

  useEffect(() => {
    setText(paragraphsToText(value || []));
  }, [value]);

  return (
    <div className="space-y-2">
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      <p className="text-xs text-muted-foreground">
        Separate paragraphs with a blank line.
      </p>
      <Textarea
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          onChange(textToParagraphs(next));
        }}
        placeholder={placeholder || "Write policy text as paragraphs…"}
        className="min-h-[140px] leading-relaxed"
        rows={8}
        disabled={loading}
      />
    </div>
  );
};

export default PolicyListField;
