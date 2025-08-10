"use client";
import { useState } from "react"
import axios from "axios"
import { Copy, Edit, MoreHorizontal, Trash, PackagePlus, Loader2, MessageCircle } from "lucide-react"
import { toast } from "react-hot-toast"
import { useParams, useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import { useAssociatePartner } from "@/hooks/use-associate-partner"
import { WhatsAppSupplierButton } from "@/components/whatsapp-supplier-button"

import { InquiryColumn } from "./columns"

interface CellActionProps {
  data: InquiryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
}) => {
  const router = useRouter();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingQuery, setCreatingQuery] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const { isAssociatePartner } = useAssociatePartner();

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/inquiries/${data.id}`);
      router.refresh();
      toast.success('Inquiry deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Inquiry ID copied to clipboard.');
  }

  const onCreateQuery = async () => {
    try {
      setCreatingQuery(true);
      toast.loading("Loading create query page...", { id: "create-query-loading" });
      
      const queryRoute = isAssociatePartner 
        ? `/tourpackagequeryfrominquiry/associate/${data.id}`
        : `/tourpackagequeryfrominquiry/${data.id}`;
      
      await router.push(queryRoute);
    } catch (error) {
      toast.error("Failed to navigate to create query page");
    } finally {
      // Don't set creatingQuery to false here since we're navigating away
      toast.dismiss("create-query-loading");
    }
  };

  const onWhatsAppSupplier = () => {
    setWhatsappOpen(true);
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      
      {/* WhatsApp Supplier Component */}
      <WhatsAppSupplierButton
        inquiryData={{
          id: data.id,
          customerName: data.customerName,
          customerMobileNumber: data.customerMobileNumber,
          location: data.location,
          journeyDate: data.journeyDate,
          numAdults: 0, // Basic data from list view
          numChildren5to11: 0,
          numChildrenBelow5: 0,
          remarks: null,
          associatePartner: data.associatePartner,
        }}
        isOpen={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        hideButton={true}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onCopy(data.id)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Id
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/inquiries/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onWhatsAppSupplier}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Message
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>          <DropdownMenuItem
            onClick={onCreateQuery}
            disabled={creatingQuery}
          >
            {creatingQuery ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="mr-2 h-4 w-4" />
            )}
            {creatingQuery ? "Loading..." : "Create Query"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

