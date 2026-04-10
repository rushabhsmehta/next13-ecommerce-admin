"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

interface EditCreditNoteAmountDialogProps {
  open: boolean;
  onClose: () => void;
  saleReturnId: string;
  creditNoteNumber: string;
  currentAmount: number;
  usedAmount: number;
  /** Maximum allowed: what was received from the customer */
  maxAmount?: number;
}

export const EditCreditNoteAmountDialog: React.FC<EditCreditNoteAmountDialogProps> = ({
  open,
  onClose,
  saleReturnId,
  creditNoteNumber,
  currentAmount,
  usedAmount,
  maxAmount,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>(currentAmount.toString());

  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount >= usedAmount - 0.01 &&
    (maxAmount === undefined || parsedAmount <= maxAmount + 0.01);

  const handleSave = async () => {
    if (!isValid) return;
    try {
      setLoading(true);
      await axios.patch(`/api/credit-notes/${saleReturnId}/amount`, {
        creditNoteAmount: parsedAmount,
      });
      toast.success("Credit note amount updated successfully.");
      router.refresh();
      onClose();
    } catch (error: any) {
      const msg =
        error?.response?.data || "Failed to update credit note amount.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Credit Note Amount</DialogTitle>
          <DialogDescription>
            Update the amount for credit note <strong>{creditNoteNumber}</strong>.
            {usedAmount > 0 && (
              <span className="block mt-1 text-amber-600 text-xs">
                ⚠ {formatPrice(usedAmount)} has already been redeemed — the new amount cannot be lower than this.
              </span>
            )}
            {maxAmount !== undefined && (
              <span className="block mt-1 text-muted-foreground text-xs">
                Maximum allowed: {formatPrice(maxAmount)} (amount received from customer).
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="cn-amount">Credit Note Amount (₹)</Label>
            <Input
              id="cn-amount"
              type="number"
              min={usedAmount > 0 ? usedAmount : 0.01}
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder="Enter new credit note amount"
            />
          </div>

          {/* Validation hints */}
          {!isNaN(parsedAmount) && parsedAmount < usedAmount - 0.01 && (
            <p className="text-xs text-destructive">
              Amount cannot be less than the redeemed amount ({formatPrice(usedAmount)}).
            </p>
          )}
          {maxAmount !== undefined && !isNaN(parsedAmount) && parsedAmount > maxAmount + 0.01 && (
            <p className="text-xs text-destructive">
              Amount cannot exceed {formatPrice(maxAmount)}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !isValid}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
