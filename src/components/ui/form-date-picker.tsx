import { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormDatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FormDatePicker({
  date,
  onSelect,
  disabled,
  placeholder = "DD/MM/YYYY"
}: FormDatePickerProps) {
  // Store the date string representation internally
  const [dateString, setDateString] = useState(
    date ? format(date, "dd/MM/yyyy") : ""
  );

  // Update the input value when the external date prop changes
  useEffect(() => {
    if (date && isValid(date)) {
      setDateString(format(date, "dd/MM/yyyy"));
    } else if (!date) {
      setDateString("");
    }
  }, [date]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDateString(newValue);

    // Don't try to parse incomplete dates
    if (newValue.length < 8) return;

    try {
      // Try to parse the date
      const parsedDate = parse(newValue, "dd/MM/yyyy", new Date());
      
      // Only update if the date is valid and properly formatted
      if (isValid(parsedDate) && 
          newValue.length === 10 && 
          format(parsedDate, "dd/MM/yyyy") === newValue) {
        onSelect(parsedDate);
      }
    } catch (err) {
      // Do nothing for invalid dates
    }
  };

  // Handle blur to clean up invalid dates
  const handleBlur = () => {
    if (dateString && (!date || !isValid(date))) {
      // Clear invalid date strings
      setDateString("");
    } else if (date && isValid(date)) {
      // Format valid dates consistently
      setDateString(format(date, "dd/MM/yyyy"));
    }
  };

  return (
    <FormControl>
      <Input
        type="text"
        placeholder={placeholder}
        value={dateString}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-full"
        // Help with input masking
        onKeyPress={(e) => {
          const char = String.fromCharCode(e.charCode);
          // Only allow digits and forward slash
          if (!/[\d/]/.test(char)) {
            e.preventDefault();
          }
          // Auto insert slashes
          if ((e.target as HTMLInputElement).value.length === 2 || (e.target as HTMLInputElement).value.length === 5) {
            if (char !== '/') {
              (e.target as HTMLInputElement).value += '/';
            }
          }
        }}
        maxLength={10}
      />
    </FormControl>
  );
}
