import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MinusCircle, PlusCircle, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export type TransportDetailItem = {
  vehicleType: string;
  quantity: number;
  capacity?: number;
  description?: string;
};

interface MultipleVehicleSelectorProps {
  value: TransportDetailItem[];
  onChange: (value: TransportDetailItem[]) => void;
  vehicleOptions: string[];
  disabled?: boolean;
}

export const MultipleVehicleSelector: React.FC<MultipleVehicleSelectorProps> = ({
  value = [],
  onChange,
  vehicleOptions,
  disabled = false
}) => {
  const [newVehicleType, setNewVehicleType] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<number>(1);

  const handleAddVehicle = () => {
    if (!newVehicleType) return;
    
    // Check if this vehicle type already exists
    const existingIndex = value.findIndex(v => v.vehicleType === newVehicleType);
    
    if (existingIndex >= 0) {
      // Update existing vehicle quantity
      const updatedVehicles = [...value];
      updatedVehicles[existingIndex] = {
        ...updatedVehicles[existingIndex],
        quantity: updatedVehicles[existingIndex].quantity + newQuantity
      };
      onChange(updatedVehicles);
    } else {
      // Add new vehicle
      onChange([
        ...value,
        {
          vehicleType: newVehicleType,
          quantity: newQuantity
        }
      ]);
    }
    
    // Reset inputs
    setNewVehicleType("");
    setNewQuantity(1);
  };

  const handleRemoveVehicle = (index: number) => {
    const updatedVehicles = [...value];
    updatedVehicles.splice(index, 1);
    onChange(updatedVehicles);
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedVehicles = [...value];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      quantity: newQuantity
    };
    onChange(updatedVehicles);
  };

  return (
    <div className="space-y-4">
      {/* Selected vehicles list */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Vehicles:</p>
          <div className="flex flex-wrap gap-2">
            {value.map((vehicle, index) => (
              <div key={index} className="bg-slate-100 rounded-md p-2 flex items-center gap-2">
                <Badge variant="secondary">
                  {vehicle.quantity}×
                </Badge>
                <span className="text-sm">{vehicle.vehicleType}</span>
                
                <div className="flex items-center ml-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuantityChange(index, vehicle.quantity - 1)}
                    disabled={vehicle.quantity <= 1 || disabled}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  
                  <span className="mx-1 text-sm">{vehicle.quantity}</span>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuantityChange(index, vehicle.quantity + 1)}
                    disabled={disabled}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-2"
                  onClick={() => handleRemoveVehicle(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Separator className="my-2" />
        </div>
      )}
      
      {/* Add new vehicle form */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={newVehicleType}
            onValueChange={setNewVehicleType}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-20">
          <Input
            type="number"
            min={1}
            value={newQuantity}
            onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
            disabled={disabled}
            className="w-full"
            placeholder="Qty"
          />
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddVehicle}
          disabled={!newVehicleType || disabled}
        >
          Add Vehicle
        </Button>
      </div>
    </div>
  );
};
