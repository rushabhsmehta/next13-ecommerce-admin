import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface PolicyItem {
  type: 'bullet' | 'paragraph';
  text: string;
}

interface PolicyListFieldProps {
  label: string;
  value: string[]; // Changed to string[] to match form schema
  onChange: (value: string[]) => void; // Changed to string[] to match form schema
  loading?: boolean;
  placeholder?: string;
}

// Helper function to convert string array to PolicyItem array
const stringArrayToPolicyItems = (items: string[]): PolicyItem[] => {
  return items.map(item => {
    // Determine if an item should be a bullet point based on length and content
    // Short items or items without detailed sentences are likely bullet points
    const isMultiSentence = item.includes('. ');
    const isLongSentence = item.length > 80;
    const containsColon = item.includes(':');
    const isParagraph = isMultiSentence || isLongSentence || containsColon;
    
    return {
      type: isParagraph ? 'paragraph' : 'bullet',
      text: item
    };
  });
};

// Helper function to convert PolicyItem array to string array
const policyItemsToStringArray = (items: PolicyItem[]): string[] => {
  return items.map(item => item.text);
};

export const PolicyListField: React.FC<PolicyListFieldProps> = ({
  label,
  value,
  onChange,
  loading,
  placeholder
}) => {
  // Convert string array to PolicyItem array for internal state
  const [items, setItems] = useState<PolicyItem[]>(stringArrayToPolicyItems(value || []));

  // Update items when value prop changes
  useEffect(() => {
    setItems(stringArrayToPolicyItems(value || []));
  }, [value]);

  const addItem = (type: 'bullet' | 'paragraph') => {
    const newItems = [...items, { type, text: '' }];
    setItems(newItems);
    onChange(policyItemsToStringArray(newItems));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(policyItemsToStringArray(newItems));
  };

  const updateItemText = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index].text = text;
    setItems(newItems);
    onChange(policyItemsToStringArray(newItems));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{label}</label>
        <div className="space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => addItem('bullet')}
            disabled={loading}
          >
            Add Bullet
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => addItem('paragraph')}
            disabled={loading}
          >
            Add Paragraph
          </Button>
        </div>
      </div>
      
      <div className="space-y-4 mt-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start space-x-2">
            {item.type === 'bullet' ? (
              <div className="w-full">
                <div className="flex items-center">
                  <span className="mr-2">•</span>
                  <Input
                    value={item.text}
                    onChange={(e) => updateItemText(index, e.target.value)}
                    placeholder={placeholder || "Bullet point text"}
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-start">
                  <Textarea
                    value={item.text}
                    onChange={(e) => updateItemText(index, e.target.value)}
                    placeholder={placeholder || "Paragraph text"}
                    className="flex-1"
                    rows={3}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="ml-2"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PolicyListField;
