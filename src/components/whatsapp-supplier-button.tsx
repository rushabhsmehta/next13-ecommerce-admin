"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Phone, Send, Users } from "lucide-react";
import { toast } from "react-hot-toast";

interface WhatsAppSupplierButtonProps {
  inquiryData: {
    id: string;
    customerName: string;
    customerMobileNumber: string;
    location: string;
    journeyDate: string | null;
    numAdults: number;
    numChildren5to11: number;
    numChildrenBelow5: number;
    remarks: string | null;
    associatePartner?: string | null;
  };
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  // Optional props for external control
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export const WhatsAppSupplierButton: React.FC<WhatsAppSupplierButtonProps> = ({
  inquiryData,
  className,
  variant = "outline",
  size = "default",
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  hideButton = false
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [supplierPhone, setSupplierPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [inputMethod, setInputMethod] = useState<"supplier" | "manual">("supplier");

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange || setInternalOpen;

  // Generate default message with inquiry details
  const generateDefaultMessage = () => {
    return generateMessageWithData(inquiryData);
  };

  // Generate message with specific inquiry data
  const generateMessageWithData = (data: typeof inquiryData) => {
    const totalTravelers = data.numAdults + data.numChildren5to11 + data.numChildrenBelow5;
    const journeyDateFormatted = data.journeyDate 
      ? (typeof data.journeyDate === 'string' 
          ? data.journeyDate  // Already formatted in list view
          : new Date(data.journeyDate).toLocaleDateString('en-GB'))
      : "To be confirmed";

    // Create message based on available data
    let message = `Hello,

I'm writing from Aagam Holidays regarding a travel inquiry:

📍 Destination: ${data.location}
🗓️ Travel Date: ${journeyDateFormatted}`;

    // Add traveler details if available (non-zero values)
    if (totalTravelers > 0) {
      message += `

👨‍👩‍👧‍👦 Group Details:
• Adults: ${data.numAdults}
• Children (5-11): ${data.numChildren5to11}
• Children (Below 5): ${data.numChildrenBelow5}
• Total Travelers: ${totalTravelers}`;
    }

    // Add remarks if available
    if (data.remarks && data.remarks.trim()) {
      message += `

📝 Special Requirements:
${data.remarks}`;
    }

    message += `

Please provide your best rates and availability for the above requirements.

Reference ID: ${data.id}

Thank you for your time and assistance.

Best regards,
Aagam Holidays Team
From: +919724444701`;

    return message;
  };

  // Fetch suppliers when component opens
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  // Generate default message when dialog opens
  useEffect(() => {
    const fetchFullInquiryAndGenerateMessage = async () => {
      try {
        if (isOpen && !customMessage.trim()) {
          // Check if this looks like limited data from list view
          // (all traveler counts are 0 and either no remarks or remarks is null)
          const hasLimitedData = (
            inquiryData.numAdults === 0 && 
            inquiryData.numChildren5to11 === 0 && 
            inquiryData.numChildrenBelow5 === 0 && 
            (!inquiryData.remarks || inquiryData.remarks === null)
          );
          
          if (hasLimitedData) {
            // Fetch complete inquiry data from API
            console.log('Fetching complete inquiry data for ID:', inquiryData.id);
            const response = await fetch(`/api/inquiries/${inquiryData.id}`);
            if (response.ok) {
              const fullInquiry = await response.json();
              console.log('Fetched complete inquiry:', fullInquiry);
              
              // Generate message with complete data
              const completeInquiryData = {
                ...inquiryData,
                numAdults: fullInquiry.numAdults || 0,
                numChildren5to11: fullInquiry.numChildren5to11 || 0,
                numChildrenBelow5: fullInquiry.numChildrenBelow5 || 0,
                remarks: fullInquiry.remarks || null,
              };
              setCustomMessage(generateMessageWithData(completeInquiryData));
            } else {
              console.error('Failed to fetch complete inquiry data');
              // Fallback to basic data if fetch fails
              setCustomMessage(generateDefaultMessage());
            }
          } else {
            // Use existing complete data (from inquiry form)
            console.log('Using existing complete data');
            setCustomMessage(generateDefaultMessage());
          }
        }
      } catch (error) {
        console.error('Error fetching inquiry data:', error);
        // Fallback to basic data
        if (isOpen && !customMessage.trim()) {
          setCustomMessage(generateDefaultMessage());
        }
      }
    };

    fetchFullInquiryAndGenerateMessage();
  }, [isOpen, generateDefaultMessage]);

  const handleOpen = () => {
    if (externalOnOpenChange) {
      externalOnOpenChange(true);
    } else {
      setInternalOpen(true);
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier && supplier.contact) {
      setSupplierPhone(supplier.contact);
    }
  };

  const handleInputMethodChange = (method: "supplier" | "manual") => {
    setInputMethod(method);
    if (method === "manual") {
      setSelectedSupplier("");
      setSupplierPhone("");
    }
  };

  const handleSendWhatsApp = () => {
    // Get phone number from either supplier selection or manual input
    const phoneToUse = inputMethod === "supplier" 
      ? (suppliers.find(s => s.id === selectedSupplier)?.contact || "")
      : supplierPhone;

    if (!phoneToUse.trim()) {
      toast.error("Please select a supplier or enter phone number");
      return;
    }

    if (!customMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsLoading(true);

    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phoneToUse.replace(/\D/g, '');
      
      // Ensure phone number starts with country code
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }

      // Encode the message for URL
      const encodedMessage = encodeURIComponent(customMessage);
      
      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast.success("WhatsApp opened with message");
      setIsOpen(false);
      setSupplierPhone("");
      setCustomMessage("");
      setSelectedSupplier("");
      setInputMethod("supplier");
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Failed to open WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as +91 XXXXX XXXXX
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSupplierPhone(formatted);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={className}
            onClick={handleOpen}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp Supplier
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send WhatsApp Message to Supplier
          </DialogTitle>
          <DialogDescription>
            Send inquiry details to a supplier via WhatsApp. Review and customize the message before sending.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Input Method Selection */}
          <div className="grid gap-2">
            <Label>Select Supplier Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inputMethod === "supplier" ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputMethodChange("supplier")}
                className="flex items-center gap-1"
              >
                <Users className="h-4 w-4" />
                From Suppliers List
              </Button>
              <Button
                type="button"
                variant={inputMethod === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputMethodChange("manual")}
                className="flex items-center gap-1"
              >
                <Phone className="h-4 w-4" />
                Manual Entry
              </Button>
            </div>
          </div>

          {/* Supplier Selection */}
          {inputMethod === "supplier" && (
            <div className="grid gap-2">
              <Label htmlFor="supplier">Select Supplier</Label>
              <Select value={selectedSupplier} onValueChange={handleSupplierSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          <span className="text-sm text-muted-foreground">{supplier.contact}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-suppliers" disabled>
                      No suppliers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedSupplier && (
                <p className="text-xs text-muted-foreground">
                  Selected: {suppliers.find(s => s.id === selectedSupplier)?.name} - {suppliers.find(s => s.id === selectedSupplier)?.contact}
                </p>
              )}
            </div>
          )}

          {/* Manual Phone Input */}
          {inputMethod === "manual" && (
            <div className="grid gap-2">
              <Label htmlFor="phone">Supplier Phone Number</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  +
                </div>
                <Input
                  id="phone"
                  placeholder="91 XXXXX XXXXX"
                  value={supplierPhone}
                  onChange={handlePhoneChange}
                  className="flex-1"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter phone number with country code (e.g., 91 98765 43210)
              </p>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Your message to the supplier..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Review and customize the message as needed. The inquiry details are pre-filled.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendWhatsApp}
            disabled={isLoading || 
              (inputMethod === "supplier" && !selectedSupplier) ||
              (inputMethod === "manual" && !supplierPhone.trim()) ||
              !customMessage.trim()
            }
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Opening..." : "Send via WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
