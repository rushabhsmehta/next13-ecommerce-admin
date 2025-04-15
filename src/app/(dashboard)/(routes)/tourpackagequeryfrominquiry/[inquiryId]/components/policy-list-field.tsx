import { useState } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { X, Plus, Edit, Check } from "lucide-react";
import { DraggableItem } from "./draggable-item";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PolicyListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  loading: boolean;
  placeholder?: string;
}

export const PolicyListField: React.FC<PolicyListFieldProps> = ({
  label,
  value = [],
  onChange,
  loading,
  placeholder = "Add item..."
}) => {
  // Ensure value is always an array
  const policyItems = Array.isArray(value) ? value : value ? [String(value)] : [];
  const [newItem, setNewItem] = useState("");
  // Track which item is currently being edited and its temporary value
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const handleAddItem = () => {
    if (newItem.trim() !== "") {
      const updatedItems = [...policyItems, newItem.trim()];
      onChange(updatedItems);
      setNewItem("");
    }
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...policyItems];
    updatedItems.splice(index, 1);
    onChange(updatedItems);
    // If removing the item being edited, exit edit mode
    if (editIndex === index) {
      setEditIndex(null);
    }
  };

  const handleStartEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(policyItems[index]);
  };
  const handleSaveEdit = (index: number) => {
    if (editValue.trim() !== "") {
      const updatedItems = [...policyItems];
      updatedItems[index] = editValue.trim();
      onChange(updatedItems);
    }
    setEditIndex(null);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
  };
  const handleMoveItem = (dragIndex: number, hoverIndex: number) => {
    const dragItem = policyItems[dragIndex];
    const updatedItems = [...policyItems];
    updatedItems.splice(dragIndex, 1);
    updatedItems.splice(hoverIndex, 0, dragItem);
    onChange(updatedItems);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isEdit: boolean = false, index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEdit && index !== undefined) {
        handleSaveEdit(index);
      } else {
        handleAddItem();
      }
    } else if (e.key === 'Escape' && isEdit) {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <FormItem className="w-full">
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div className="space-y-2 w-full">
          <div className="flex gap-2">
            <Input
              disabled={loading}
              placeholder={placeholder}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e)}
              className="flex-grow"
            />
            <Button 
              type="button"
              onClick={handleAddItem}
              disabled={loading || !newItem.trim()}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>          <DndProvider backend={HTML5Backend}>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {policyItems.map((item, index) => (
                <DraggableItem
                  key={index}
                  id={index}
                  index={index}
                  text={item}
                  isEditing={editIndex === index}
                  editValue={editValue}
                  loading={loading}
                  moveItem={handleMoveItem}
                  onStartEdit={() => handleStartEdit(index)}
                  onSaveEdit={() => handleSaveEdit(index)}
                  onCancelEdit={handleCancelEdit}
                  onChangeEdit={(value) => setEditValue(value)}
                  onRemove={() => handleRemoveItem(index)}
                  onKeyDown={(e) => handleKeyPress(e, true, index)}
                />
              ))}
              {policyItems.length === 0 && (
                <div className="text-sm text-gray-500 italic p-2">No items added yet.</div>
              )}
            </div>
          </DndProvider>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
