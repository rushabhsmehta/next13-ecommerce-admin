"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageCircle, Send, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

// Types for supplier data
interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  contacts?: Array<{ number: string }>; // new contacts array
}

// Types for inquiry data
interface InquiryData {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  location: string;
  journeyDate: string | null;
  numAdults?: number; // Optional because list view doesn't have this
  numChildren5to11?: number; // Optional because list view doesn't have this
  numChildrenBelow5?: number; // Optional because list view doesn't have this
  remarks?: string | null; // Optional because list view doesn't have this
  associatePartner: string | null;
}

interface WhatsAppSupplierButtonProps {
  inquiryData: InquiryData;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

// Default message template (customer name/number intentionally omitted for privacy)
const DEFAULT_MESSAGE_TEMPLATE = `🌟 *New Travel Inquiry* 🌟

📍 *Destination:* {{location}}

📅 *Journey Date:* {{journeyDate}}

👥 *Travelers:* {{travelers}}

💬 *Special Requirements:*
{{remarks}}

Please share your best rates and availability.
Looking forward to your response! 🙏

Best regards,
Aagam Holidays Team`;

export const WhatsAppSupplierButton: React.FC<WhatsAppSupplierButtonProps> = ({
  inquiryData,
  isOpen = false,
  onOpenChange,
  hideButton = false,
  variant = "outline",
  size = "sm"
}) => {
  const [open, setOpen] = useState(isOpen);
  const [supplierPhone, setSupplierPhone] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(false);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update open state when prop changes
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    
    // Reset form when dialog closes
    if (!newOpen) {
      setSelectedSupplier('');
      setSupplierPhone('');
      setSupplierDropdownOpen(false);
      setSearchTerm('');
    }
  };

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setIsFetchingSuppliers(true);
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const suppliersData = await response.json();
        const validSuppliers = suppliersData.filter((supplier: Supplier) => supplier.contact || (supplier.contacts && supplier.contacts.length > 0));
        setSuppliers(validSuppliers);
        setFilteredSuppliers(validSuppliers);
      } else {
        toast.error('Failed to load suppliers');
      }
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setIsFetchingSuppliers(false);
    }
  };

  // Filter suppliers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact && supplier.contact.includes(searchTerm)) ||
        (supplier.contacts && supplier.contacts.some(c => c.number.includes(searchTerm)))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  // Fetch suppliers when dialog opens
  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  // Handle supplier selection
  const handleSupplierSelect = (value: string) => {
    const supplier = suppliers.find(s => s.id === value);
    if (supplier) {
      setSelectedSupplier(supplier.id);
      setSupplierPhone(supplier.contact || (supplier.contacts && supplier.contacts[0]?.number) || '');
    } else {
      setSelectedSupplier('');
      setSupplierPhone('');
    }
    setSupplierDropdownOpen(false);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedSupplier('');
    setSupplierPhone('');
    setSearchTerm('');
    setSupplierDropdownOpen(false);
  };


  // ...other hooks and functions...


  // --- Move these functions above the useEffect to fix hoisting ---
  const populateMessageFromData = (data: any) => {
    // Build a clean travelers string, skipping zero counts and handling plurals
    const parts: string[] = [];
    const adults = Number(data.numAdults || 0);
    const kids511 = Number(data.numChildren5to11 || 0);
    const kidsBelow5 = Number(data.numChildrenBelow5 || 0);

    if (adults > 0) parts.push(`${adults} Adult${adults === 1 ? '' : 's'}`);
    if (kids511 > 0) parts.push(`${kids511} Child${kids511 === 1 ? '' : 'ren'} (5-11)`);
    if (kidsBelow5 > 0) parts.push(`${kidsBelow5} Child${kidsBelow5 === 1 ? '' : 'ren'} (Below 5)`);

    const travelers = parts.length > 0 ? parts.join(', ') : 'Not specified';

    // Format date as dd/mm/yyyy
    let formattedDate = 'Not specified';
    if (data.journeyDate) {
      const date = new Date(data.journeyDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    }

    // Extract location name - handle both string and object formats
    let locationName = 'Not specified';
    if (data.location) {
      if (typeof data.location === 'string') {
        locationName = data.location;
      } else if (data.location.label) {
        locationName = data.location.label;
      } else if (data.location.name) {
        locationName = data.location.name;
      } else {
        // Fallback: try to stringify and extract meaningful info
        locationName = String(data.location);
      }
    }

    // Normalize remarks: ensure non-empty string
    const remarks = (data.remarks && String(data.remarks).trim()) ? String(data.remarks).trim() : 'None specified';

    const populatedMessage = DEFAULT_MESSAGE_TEMPLATE
      .replace('{{location}}', locationName)
      .replace('{{journeyDate}}', formattedDate)
      .replace('{{travelers}}', travelers)
      .replace('{{remarks}}', remarks);
    setMessage(populatedMessage);
  };

  const fetchCompleteInquiryData = React.useCallback(async (inquiryId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}`);
      if (response.ok) {
        const completeData = await response.json();
        populateMessageFromData(completeData);
      } else {
        populateMessageFromData(inquiryData); // Fallback to basic data
      }
    } catch (error) {
      populateMessageFromData(inquiryData); // Fallback to basic data
    } finally {
      setIsLoading(false);
    }
  }, [inquiryData]);

  // Fetch and populate message template with complete inquiry data
  useEffect(() => {
    if (open && inquiryData) {
      // If we have complete data, use it directly
      if (inquiryData.numAdults !== undefined && inquiryData.numAdults !== 0) {
        populateMessageFromData(inquiryData);
      } else {
        // Fetch complete inquiry data from API
        fetchCompleteInquiryData(inquiryData.id);
      }
    }
  }, [open, inquiryData, fetchCompleteInquiryData]);


  // Format phone number for WhatsApp (remove any non-digits and ensure it starts with country code)
  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it starts with 91 (India) and has 12 digits total, use as is
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly;
    }
    
    // If it's 10 digits and doesn't start with 91, assume it's Indian number
    if (digitsOnly.length === 10) {
      return '91' + digitsOnly;
    }
    
    // If it starts with 0, remove the 0 and add 91
    if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      return '91' + digitsOnly.substring(1);
    }
    
    // Return as is if it's already properly formatted
    return digitsOnly;
  };

  // Validate phone number
  const isValidPhone = (phone: string): boolean => {
    const formatted = formatPhoneForWhatsApp(phone);
    return formatted.length >= 10 && formatted.length <= 15;
  };

  // Reset form
  const resetForm = () => {
    setSupplierPhone('');
    setMessage('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierPhone.trim()) {
      toast.error("Please enter supplier phone number");
      return;
    }

    if (!isValidPhone(supplierPhone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    handleSendWhatsApp();
  };

  const handleSendWhatsApp = () => {
    if (!supplierPhone || !message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      // Format phone number for WhatsApp
      const formattedPhone = formatPhoneForWhatsApp(supplierPhone);
      
      if (!isValidPhone(formattedPhone)) {
        toast.error("Invalid phone number format");
        setIsLoading(false);
        return;
      }

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast.success("WhatsApp opened with message");
      
      // Reset form and close dialog
      resetForm();
      handleOpenChange(false);
      
    } catch (error) {
      toast.error("Failed to open WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  const DialogComponent = (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button variant={variant} size={size}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp Supplier
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Supplier via WhatsApp</DialogTitle>
          <DialogDescription className="sr-only">
            Select a supplier, compose a message, and send it via WhatsApp.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier Dropdown with Search */}
          <div className="space-y-2">
            <Label htmlFor="supplier-select">Select Supplier</Label>
            <Popover 
              open={supplierDropdownOpen} 
              onOpenChange={setSupplierDropdownOpen}
              modal={true}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierDropdownOpen}
                  className="w-full justify-between h-auto min-h-[40px]"
                  disabled={isFetchingSuppliers}
                >
                  {selectedSupplier ? (
                    (() => {
                      const supplier = suppliers.find(s => s.id === selectedSupplier);
                      return supplier ? (
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{supplier.name}</span>
                          <span className="text-xs text-muted-foreground">{supplier.contact || supplier.contacts?.[0]?.number}</span>
                        </div>
                      ) : "Select supplier...";
                    })()
                  ) : isFetchingSuppliers ? (
                    "Loading suppliers..."
                  ) : (
                    "Choose a supplier or enter manually below"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[400px] p-0"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  searchInputRef.current?.focus();
                }}
              >
                <Command>
                  <CommandInput
                    ref={searchInputRef}
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>{searchTerm ? 'No suppliers found.' : 'No suppliers available.'}</CommandEmpty>
                    <CommandGroup>
                      {selectedSupplier && (
                        <CommandItem onSelect={handleClearSelection} className="text-muted-foreground cursor-pointer">
                          Clear selection
                        </CommandItem>
                      )}
                      {filteredSuppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.id}
                          onSelect={() => handleSupplierSelect(supplier.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSupplier === supplier.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">{supplier.contact || supplier.contacts?.[0]?.number}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Supplier Phone Number</Label>
            <Input
              id="supplier-phone"
              placeholder="Enter supplier WhatsApp number"
              value={supplierPhone}
              onChange={(e) => {
                setSupplierPhone(e.target.value);
                // Clear selection if manually typing
                if (selectedSupplier) {
                  setSelectedSupplier('');
                }
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter with country code (e.g., +91 for India)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder={isLoading ? "Loading inquiry data..." : "Message to send to supplier"}
              value={isLoading ? "Loading complete inquiry data..." : message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return DialogComponent;
};
