"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Edit } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

interface EditableCellProps {
  value: string;
  tourPackageId: string;
  field: string;
  onUpdate?: (newValue: string) => void;
}

interface EditableSelectCellProps extends EditableCellProps {
  options?: (string | { value: string; label: string })[];
}

export const EditableSelectCell: React.FC<EditableSelectCellProps> = ({
  value,
  tourPackageId,
  field,
  options = [],
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.patch(`/api/tourPackages/${tourPackageId}/field-update`, {
        field: field,
        value: editValue
      });
      
      toast.success(`Updated successfully!`);
      onUpdate?.(editValue);
      setIsEditing(false);
      
      // Trigger a soft refresh to update the data with server timestamp
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tourPackageUpdated', {
          detail: { 
            id: tourPackageId, 
            field, 
            value: editValue,
            updatedAt: response.data.updatedAt
          }
        }));
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to update`);
      setEditValue(value); // Reset to original value
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group min-h-[32px]">
        <span className="min-w-0 flex-1">{value || 'Not specified'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="opacity-50 group-hover:opacity-100 hover:bg-blue-100 transition-all h-7 w-7 p-0 shrink-0"
          title={`Edit ${field}`}
        >
          <Edit className="h-3 w-3 text-blue-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-h-[32px]">
      <Select value={editValue} onValueChange={setEditValue}>
        <SelectTrigger className="h-8 min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={typeof option === 'string' ? option : option.value} 
              value={typeof option === 'string' ? option : option.value}
            >
              {typeof option === 'string' ? option : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isLoading}
        className="h-7 w-7 p-0 bg-green-100 hover:bg-green-200 shrink-0"
        title="Save changes"
      >
        <Check className="h-3 w-3 text-green-700" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={isLoading}
        className="h-7 w-7 p-0 bg-red-100 hover:bg-red-200 shrink-0"
        title="Cancel changes"
      >
        <X className="h-3 w-3 text-red-700" />
      </Button>
    </div>
  );
};

export const EditableInputCell: React.FC<EditableCellProps> = ({
  value,
  tourPackageId,
  field,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.patch(`/api/tourPackages/${tourPackageId}/field-update`, {
        field: field,
        value: editValue
      });
      
      toast.success(`Updated successfully!`);
      onUpdate?.(editValue);
      setIsEditing(false);
      
      // Trigger a soft refresh to update the data with server timestamp
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tourPackageUpdated', {
          detail: { 
            id: tourPackageId, 
            field, 
            value: editValue,
            updatedAt: response.data.updatedAt
          }
        }));
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to update`);
      setEditValue(value); // Reset to original value
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group min-h-[32px]">
        <span className="min-w-0 flex-1">{value || 'Not specified'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="opacity-50 group-hover:opacity-100 hover:bg-blue-100 transition-all h-7 w-7 p-0 shrink-0"
          title={`Edit ${field}`}
        >
          <Edit className="h-3 w-3 text-blue-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-h-[32px]">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 min-w-[140px]"
        autoFocus
        placeholder="e.g., 5N 6D"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isLoading}
        className="h-7 w-7 p-0 bg-green-100 hover:bg-green-200 shrink-0"
        title="Save changes"
      >
        <Check className="h-3 w-3 text-green-700" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={isLoading}
        className="h-7 w-7 p-0 bg-red-100 hover:bg-red-200 shrink-0"
        title="Cancel changes"
      >
        <X className="h-3 w-3 text-red-700" />
      </Button>
    </div>
  );
};
