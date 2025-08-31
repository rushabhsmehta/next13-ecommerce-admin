"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "react-hot-toast";

// Types for inquiry data
interface InquiryData {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  location: string;
  journeyDate: string | null;
  numAdults: number;
  numChildren5to11: number;
  numChildrenBelow5: number;
  remarks: string | null;
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

// Default message template
const DEFAULT_MESSAGE_TEMPLATE = `Hi,

I have a travel inquiry for your review:

Customer: {{customerName}}
Contact: {{customerMobileNumber}}
Destination: {{location}}
Journey Date: {{journeyDate}}
Travelers: {{numAdults}} Adults, {{numChildren5to11}} Children (5-11), {{numChildrenBelow5}} Children (Below 5)
Associate Partner: {{associatePartner}}

Remarks: {{remarks}}

Please share your best rates and availability.

Thanks!`;

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
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
  };

  // Populate message template with inquiry data
  useEffect(() => {
    if (open && inquiryData) {
      let populatedMessage = DEFAULT_MESSAGE_TEMPLATE;
      
      // Replace placeholders with actual data
      populatedMessage = populatedMessage
        .replace('{{customerName}}', inquiryData.customerName || 'N/A')
        .replace('{{customerMobileNumber}}', inquiryData.customerMobileNumber || 'N/A')
        .replace('{{location}}', inquiryData.location || 'N/A')
        .replace('{{journeyDate}}', inquiryData.journeyDate ? new Date(inquiryData.journeyDate).toLocaleDateString() : 'Not specified')
        .replace('{{numAdults}}', inquiryData.numAdults?.toString() || '0')
        .replace('{{numChildren5to11}}', inquiryData.numChildren5to11?.toString() || '0')
        .replace('{{numChildrenBelow5}}', inquiryData.numChildrenBelow5?.toString() || '0')
        .replace('{{associatePartner}}', inquiryData.associatePartner || 'Direct')
        .replace('{{remarks}}', inquiryData.remarks || 'None');

      setMessage(populatedMessage);
    }
  }, [open, inquiryData]);

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
      console.error('Error opening WhatsApp:', error);
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
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Supplier Phone Number</Label>
            <Input
              id="supplier-phone"
              placeholder="Enter supplier WhatsApp number"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
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
              placeholder="Message to send to supplier"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              required
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
