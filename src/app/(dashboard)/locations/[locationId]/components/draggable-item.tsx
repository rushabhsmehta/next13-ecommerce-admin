import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from "@/components/ui/button";
import { Edit, X, GripVertical } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface DraggableItemProps {
  id: any;
  index: number;
  text: string;
  isEditing: boolean;
  editValue: string;
  loading: boolean;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onChangeEdit: (value: string) => void;
  onRemove: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  index,
  text,
  isEditing,
  editValue,
  loading,
  moveItem,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeEdit,
  onRemove,
  onKeyDown
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
    accept: 'POLICY_ITEM',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'POLICY_ITEM',
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isEditing && !loading,
  });

  const opacity = isDragging ? 0.4 : 1;
  
  // Initialize drag preview and drop target
  drag(drop(ref));

  return (
    <div 
      ref={(node) => { preview(node); }} 
      className={`flex items-center gap-2 p-2 border rounded-md ${isDragging ? 'bg-gray-200' : 'bg-gray-50'}`}
      style={{ opacity }}
      data-handler-id={handlerId}
    >
      {!isEditing && (
        <div 
          ref={ref}
          className={`cursor-grab p-1 text-gray-400 hover:text-gray-600 ${loading ? 'cursor-not-allowed' : ''}`}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      {isEditing ? (
        // Edit mode
        <div className="flex-grow flex gap-2">
          <Input
            autoFocus
            value={editValue}
            onChange={(e) => onChangeEdit(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-grow"
          />
          <Button
            type="button"
            onClick={onSaveEdit}
            disabled={loading || !editValue.trim()}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Save</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-4 w-4"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </Button>
          <Button
            type="button"
            onClick={onCancelEdit}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Cancel</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // View mode
        <>
          <div className="flex-grow break-words">{text}</div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              type="button"
              onClick={onStartEdit}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <span className="sr-only">Edit</span>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              onClick={onRemove}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <span className="sr-only">Remove</span>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
