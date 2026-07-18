"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Mail, Send, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string | null;
  contacts?: Array<{ number: string; isPrimary?: boolean }>;
}

interface InquiryData {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  location: string;
  journeyDate: string | null;
  numAdults?: number;
  numChildren5to11?: number;
  numChildrenBelow5?: number;
  remarks?: string | null;
  associatePartner: string | null;
}

interface EmailSupplierButtonProps {
  inquiryData: InquiryData;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const DEFAULT_MESSAGE_TEMPLATE = `New Travel Inquiry

Destination: {{location}}

Journey Date: {{journeyDate}}

Travelers: {{travelers}}

Special Requirements:
{{remarks}}

Please share your best rates and availability.
Looking forward to your response.

Best regards,
Aagam Holidays Team`;

function getSupplierEmail(supplier: Supplier): string {
  return (supplier.email || "").trim();
}

export const EmailSupplierButton: React.FC<EmailSupplierButtonProps> = ({
  inquiryData,
  isOpen = false,
  onOpenChange,
  hideButton = false,
  variant = "outline",
  size = "sm",
}) => {
  const [open, setOpen] = useState(isOpen);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(false);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setSelectedSupplier("");
      setSupplierEmail("");
      setSupplierDropdownOpen(false);
      setSearchTerm("");
    }
  };

  const fetchSuppliers = async () => {
    try {
      setIsFetchingSuppliers(true);
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const suppliersData = await response.json();
        const validSuppliers = (suppliersData as Supplier[]).filter((s) =>
          getSupplierEmail(s)
        );
        setSuppliers(validSuppliers);
        setFilteredSuppliers(validSuppliers);
      } else {
        toast.error("Failed to load suppliers");
      }
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setIsFetchingSuppliers(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredSuppliers(
        suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            getSupplierEmail(s).toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, suppliers]);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  const handleSupplierSelect = (value: string) => {
    const supplier = suppliers.find((s) => s.id === value);
    if (supplier) {
      setSelectedSupplier(supplier.id);
      setSupplierEmail(getSupplierEmail(supplier));
    } else {
      setSelectedSupplier("");
      setSupplierEmail("");
    }
    setSupplierDropdownOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedSupplier("");
    setSupplierEmail("");
    setSearchTerm("");
    setSupplierDropdownOpen(false);
  };

  const populateFromData = (data: InquiryData | Record<string, unknown>) => {
    const parts: string[] = [];
    const adults = Number((data as InquiryData).numAdults || 0);
    const kids511 = Number((data as InquiryData).numChildren5to11 || 0);
    const kidsBelow5 = Number((data as InquiryData).numChildrenBelow5 || 0);

    if (adults > 0) parts.push(`${adults} Adult${adults === 1 ? "" : "s"}`);
    if (kids511 > 0)
      parts.push(`${kids511} Child${kids511 === 1 ? "" : "ren"} (5-11)`);
    if (kidsBelow5 > 0)
      parts.push(
        `${kidsBelow5} Child${kidsBelow5 === 1 ? "" : "ren"} (Below 5)`
      );

    const travelers = parts.length > 0 ? parts.join(", ") : "Not specified";

    let formattedDate = "Not specified";
    const journeyDate = (data as InquiryData).journeyDate;
    if (journeyDate) {
      const date = new Date(journeyDate);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    }

    let locationName = "Not specified";
    const location = (data as InquiryData).location as unknown;
    if (location) {
      if (typeof location === "string") {
        locationName = location;
      } else if (
        typeof location === "object" &&
        location !== null &&
        "label" in location
      ) {
        locationName = String((location as { label?: string }).label || "");
      } else if (
        typeof location === "object" &&
        location !== null &&
        "name" in location
      ) {
        locationName = String((location as { name?: string }).name || "");
      }
    }

    const remarksRaw = (data as InquiryData).remarks;
    const remarks =
      remarksRaw && String(remarksRaw).trim()
        ? String(remarksRaw).trim()
        : "None specified";

    setSubject(`Travel Inquiry — ${locationName} — ${formattedDate}`);
    setMessage(
      DEFAULT_MESSAGE_TEMPLATE.replace("{{location}}", locationName)
        .replace("{{journeyDate}}", formattedDate)
        .replace("{{travelers}}", travelers)
        .replace("{{remarks}}", remarks)
    );
  };

  const fetchCompleteInquiryData = React.useCallback(
    async (inquiryId: string) => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/inquiries/${inquiryId}`);
        if (response.ok) {
          const completeData = await response.json();
          populateFromData(completeData);
        } else {
          populateFromData(inquiryData);
        }
      } catch {
        populateFromData(inquiryData);
      } finally {
        setIsLoading(false);
      }
    },
    [inquiryData]
  );

  useEffect(() => {
    if (open && inquiryData) {
      if (
        inquiryData.numAdults !== undefined &&
        inquiryData.numAdults !== 0
      ) {
        populateFromData(inquiryData);
      } else {
        fetchCompleteInquiryData(inquiryData.id);
      }
    }
  }, [open, inquiryData, fetchCompleteInquiryData]);

  const isValidEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierEmail.trim()) {
      toast.error("Please enter supplier email");
      return;
    }
    if (!isValidEmail(supplierEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/inquiries/${inquiryData.id}/email-supplier`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: supplierEmail.trim(),
            subject: subject.trim(),
            body: message.trim(),
            supplierId: selectedSupplier || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(
          data?.error ||
            (response.status === 503
              ? "Gmail is not configured on the server"
              : "Failed to send email")
        );
        return;
      }

      toast.success("Email sent to supplier");
      setSelectedSupplier("");
      setSupplierEmail("");
      setSubject("");
      setMessage("");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const busy = isLoading || isSending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button variant={variant} size={size}>
            <Mail className="h-4 w-4 mr-2" />
            Email Supplier
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Email Supplier</DialogTitle>
          <DialogDescription className="sr-only">
            Select a supplier, compose an email, and send it from Aagam Holidays
            Gmail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-supplier-select">Select Supplier</Label>
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
                      const supplier = suppliers.find(
                        (s) => s.id === selectedSupplier
                      );
                      return supplier ? (
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{supplier.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getSupplierEmail(supplier)}
                          </span>
                        </div>
                      ) : (
                        "Select supplier..."
                      );
                    })()
                  ) : isFetchingSuppliers ? (
                    "Loading suppliers..."
                  ) : (
                    "Choose a supplier or enter email below"
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
                    <CommandEmpty>
                      {searchTerm
                        ? "No suppliers found."
                        : "No suppliers with email available."}
                    </CommandEmpty>
                    <CommandGroup>
                      {selectedSupplier && (
                        <CommandItem
                          onSelect={handleClearSelection}
                          className="text-muted-foreground cursor-pointer"
                        >
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
                              selectedSupplier === supplier.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {getSupplierEmail(supplier)}
                            </span>
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
            <Label htmlFor="supplier-email">Supplier Email</Label>
            <Input
              id="supplier-email"
              type="email"
              placeholder="supplier@example.com"
              value={supplierEmail}
              onChange={(e) => {
                setSupplierEmail(e.target.value);
                if (selectedSupplier) {
                  setSelectedSupplier("");
                }
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Sent from aagamholiday@gmail.com
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder={isLoading ? "Loading..." : "Email subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              placeholder={
                isLoading ? "Loading inquiry data..." : "Message to supplier"
              }
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
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {isSending ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
