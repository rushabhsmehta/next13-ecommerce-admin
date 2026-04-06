"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  amount: number;
  availableCredit: number;
  expiryDate: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  returnReason: string | null;
}

interface ApplyCreditNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tourPackageQueryId: string;
  customers: { id: string; name: string }[];
}

export const ApplyCreditNoteDialog: React.FC<ApplyCreditNoteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  tourPackageQueryId,
  customers
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [selectedCNId, setSelectedCNId] = useState("");
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [fetchingCN, setFetchingCN] = useState(false);
  const [fetchingSales, setFetchingSales] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedCustomerId("");
      setCreditNotes([]);
      setSelectedCNId("");
      setSales([]);
      setSelectedSaleId("");
      setAmount(0);
    }
  }, [open]);

  // Fetch credit notes when customer selected
  useEffect(() => {
    if (!selectedCustomerId) { setCreditNotes([]); setSelectedCNId(""); return; }
    setFetchingCN(true);
    axios.get(`/api/credit-notes?customerId=${selectedCustomerId}`)
      .then(r => setCreditNotes(r.data.filter((cn: CreditNote) => !cn.isExpired && cn.availableCredit > 0.01)))
      .catch(() => toast.error("Failed to load credit notes"))
      .finally(() => setFetchingCN(false));
  }, [selectedCustomerId]);

  // Fetch sales for this tour query
  useEffect(() => {
    if (!tourPackageQueryId) return;
    setFetchingSales(true);
    axios.get(`/api/sales?tourPackageQueryId=${tourPackageQueryId}`)
      .then(r => {
        const salesWithOutstanding = r.data.map((s: any) => {
          const totalAllocated = (s.receiptAllocations || []).reduce((sum: number, a: any) => sum + a.allocatedAmount, 0);
          const saleTotal = s.salePrice + (s.gstAmount ?? 0);
          return { ...s, outstanding: Math.max(0, saleTotal - totalAllocated) };
        });
        setSales(salesWithOutstanding.filter((s: any) => s.outstanding > 0.01));
      })
      .catch(() => {})
      .finally(() => setFetchingSales(false));
  }, [tourPackageQueryId]);

  const selectedCN = creditNotes.find(cn => cn.id === selectedCNId);
  const selectedSale = sales.find(s => s.id === selectedSaleId);

  const maxAmount = selectedCN && selectedSale
    ? Math.min(selectedCN.availableCredit, selectedSale.outstanding)
    : 0;

  const handleApply = async () => {
    if (!selectedCNId || !selectedSaleId || amount <= 0) {
      toast.error("Please select a credit note, a sale, and enter an amount");
      return;
    }
    if (amount > maxAmount + 0.01) {
      toast.error(`Amount cannot exceed ${formatPrice(maxAmount)}`);
      return;
    }
    try {
      setLoading(true);
      await axios.post(`/api/credit-notes/${selectedCNId}/apply`, {
        tourPackageQueryId,
        saleDetailId: selectedSaleId,
        amount
      });
      toast.success(`Credit note applied: ${formatPrice(amount)}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data || "Failed to apply credit note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-600" />
            Apply Credit Note
          </DialogTitle>
          <DialogDescription>
            Apply an existing credit note to reduce the outstanding balance on this tour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer Selector */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Credit Note Selector */}
          <div className="space-y-1.5">
            <Label>Select Credit Note</Label>
            <Select
              value={selectedCNId}
              onValueChange={(v) => {
                setSelectedCNId(v);
                const cn = creditNotes.find(c => c.id === v);
                if (selectedSale && cn) {
                  setAmount(parseFloat(Math.min(cn.availableCredit, selectedSale.outstanding).toFixed(2)));
                }
              }}
              disabled={!selectedCustomerId || fetchingCN}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetchingCN ? "Loading..." : "Select a credit note..."} />
              </SelectTrigger>
              <SelectContent>
                {creditNotes.length === 0 ? (
                  <SelectItem value="_none" disabled>No available credit notes for this customer</SelectItem>
                ) : (
                  creditNotes.map(cn => (
                    <SelectItem key={cn.id} value={cn.id}>
                      {cn.creditNoteNumber} — {formatPrice(cn.availableCredit)} available
                      {cn.daysUntilExpiry !== null && cn.daysUntilExpiry <= 30 && (
                        <span className="text-amber-600 ml-2">(expires in {cn.daysUntilExpiry}d)</span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedCN && (
              <p className="text-xs text-muted-foreground">
                Original: {formatPrice(selectedCN.amount)} &bull; Available: {formatPrice(selectedCN.availableCredit)}
                {selectedCN.expiryDate && (
                  <> &bull; Expires: {format(new Date(selectedCN.expiryDate), 'dd MMM yyyy')}</>
                )}
              </p>
            )}
          </div>

          {/* Sale Selector */}
          <div className="space-y-1.5">
            <Label>Apply to Sale Invoice</Label>
            <Select
              value={selectedSaleId}
              onValueChange={(v) => {
                setSelectedSaleId(v);
                const sale = sales.find(s => s.id === v);
                if (sale && selectedCN) {
                  setAmount(parseFloat(Math.min(selectedCN.availableCredit, sale.outstanding).toFixed(2)));
                }
              }}
              disabled={fetchingSales}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetchingSales ? "Loading sales..." : "Select a sale invoice..."} />
              </SelectTrigger>
              <SelectContent>
                {sales.length === 0 ? (
                  <SelectItem value="_none" disabled>No outstanding sales on this tour</SelectItem>
                ) : (
                  sales.map(sale => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.invoiceNumber || `Sale ${sale.id.slice(0, 8)}`} — Outstanding: {formatPrice(sale.outstanding)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount to Apply</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={maxAmount}
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-8"
              />
            </div>
            {maxAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum: {formatPrice(maxAmount)}
                <button
                  type="button"
                  className="ml-2 text-green-600 underline text-xs"
                  onClick={() => setAmount(parseFloat(maxAmount.toFixed(2)))}
                >
                  Use max
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={loading || !selectedCNId || !selectedSaleId || amount <= 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? "Applying..." : "Apply Credit Note"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
