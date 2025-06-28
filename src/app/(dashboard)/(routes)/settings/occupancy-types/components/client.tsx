"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, GripVertical, Search } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
  SortableContext as SortableContextProvider,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface OccupancyType {
  id: string;
  name: string;
  description: string;
  maxPersons: number;
  rank: number;
  isActive: boolean;
  createdAt: string;
}

interface OccupancyTypesClientProps {
  data: OccupancyType[];
}

interface SortableRowProps {
  occupancyType: OccupancyType;
  onEdit: (id: string) => void;
}

function SortableRow({ occupancyType, onEdit }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: occupancyType.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        ${isDragging ? 'bg-blue-50 shadow-lg border border-blue-200' : ''} 
        hover:bg-gray-50/50 
        transition-colors
      `}
    >
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="
            cursor-grab 
            active:cursor-grabbing 
            p-1 
            hover:bg-blue-100 
            rounded 
            transition-colors
            flex 
            items-center 
            justify-center
          "
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-gray-400 hover:text-blue-600" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{occupancyType.name}</TableCell>
      <TableCell>{occupancyType.description}</TableCell>
      <TableCell>{occupancyType.maxPersons}</TableCell>
      <TableCell>{occupancyType.rank}</TableCell>
      <TableCell>
        <Badge variant={occupancyType.isActive ? "outline" : "destructive"}>
          {occupancyType.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>{occupancyType.createdAt}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(occupancyType.id)}>
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export const OccupancyTypesClient: React.FC<OccupancyTypesClientProps> = ({
  data
}) => {
  const router = useRouter();
  const [items, setItems] = useState<OccupancyType[]>(data);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update ranks based on new positions
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        rank: index,
      }));

      setItems(updatedItems);
      
      // Update ranks in the backend
      try {
        setIsUpdating(true);
        
        // Use bulk update endpoint for better performance
        const updates = updatedItems.map((item, index) => ({
          id: item.id,
          rank: index
        }));
        
        await axios.patch('/api/occupancy-types', { updates });
        
        toast.success('Occupancy types reordered successfully');
        router.refresh();
      } catch (error) {
        toast.error('Failed to update order');
        // Revert to original order
        setItems(data);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/settings/occupancy-types/${id}`);
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Occupancy Types (${data.length})`}
          description="Manage occupancy types for your accommodations. Drag and drop to reorder."
        />
        <Button onClick={() => router.push(`/settings/occupancy-types/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />

      {/* Search Input */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search occupancy types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Drag and drop the grip handle (⋮⋮) to reorder occupancy types. The new order will be saved automatically.
        </AlertDescription>
      </Alert>
      
      <div className="rounded-md border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Max Persons</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={filteredItems} strategy={verticalListSortingStrategy}>
                {filteredItems.map((item) => (
                  <SortableRow
                    key={item.id}
                    occupancyType={item}
                    onEdit={handleEdit}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
          
          <DragOverlay>
            {activeItem ? (
              <div className="bg-white border border-blue-300 rounded-lg shadow-xl p-4 opacity-90">
                <div className="font-semibold text-blue-800">{activeItem.name}</div>
                <div className="text-sm text-gray-600">{activeItem.description}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      {isUpdating && (
        <div className="text-sm text-gray-500 mt-2">
          Updating order...
        </div>
      )}
      
      {filteredItems.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          No occupancy types found matching &quot;{searchTerm}&quot;
        </div>
      )}
    </>
  );
};
