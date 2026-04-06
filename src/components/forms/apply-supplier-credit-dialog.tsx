"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

interface SupplierCredit {
  id: string;
  supplierName: string;
  supplierId: string | null;
  amount: number;
  availableCredit: number;
  supplierCreditExpiry: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  returnReason: string | null;
  originalTour: string;
}

interface ApplySupplierCreditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tourPackageQueryId: string;
  suppliers: { id: string; name: string }[];
}

export const ApplySupplierCreditDialog: React.FC<ApplySupplierCreditDialogProps> = ({
  open,
  onClose,
  onSuccess,
  tourPackageQueryId,
  suppliers
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierCredits, setSupplierCredits] = useState<SupplierCredit[]>([]);
  const [selectedCreditId, setSelectedCreditId] = useState("");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [fetchingCredits, setFetchingCredits] = useState(false);
  const [fetchingPurchases, setFetchingPurchases] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedSupplierId("");
      setSupplierCredits([]);
      setSelectedCreditId("");
      setPurchases([]);
      setSelectedPurchaseId("");
      setAmount(0);
    }
  }, [open]);

  // Fetch supplier credits when supplier selected
  useEffect(() => {
    if (!selectedSupplierId) { setSupplierCredits([]); setSelectedCreditId(""); return; }
    setFetchingCredits(true);
    axios.get(`/api/supplier-credits?supplierId=${selectedSupplierId}`)
      .then(r => setSupplierCredits(r.data.filter((sc: SupplierCredit) => !sc.isExpired && sc.availableCredit > 0.01)))
      .catch(() => toast.error("Failed to load supplier credits"))
      .finally(() => setFetchingCredits(false));
  }, [selectedSupplierId]);

  // Fetch purchases for this tour query
  useEffect(() => {
    if (!tourPackageQueryId) return;
    setFetchingPurchases(true);
    axios.get(`/api/purchases?tourPackageQueryId=${tourPackageQueryId}`)
      .then(r => {
        const withOutstanding = r.data.map((p: any) => {
          const totalAllocated = (p.paymentAllocations || []).reduce((sum: number, a: any) => sum + a.allocatedAmount, 0);
          const purchaseTotal = (p.netPayable ?? p.price) + (p.gstAmount ?? 0);
          return { ...p, outstanding: Math.max(0, purchaseTotal - totalAllocated) };
        });
        setPurchases(withOutstanding.filter((p: any) => p.outstanding > 0.01));
      })
      .catch(() => {})
      .finally(() => setFetchingPurchases(false));
  }, [tourPackageQueryId]);

  const selectedCredit = supplierCredits.find(sc => sc.id === selectedCreditId);
  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);

  const maxAmount = selectedCredit && selectedPurchase
    ? Math.min(selectedCredit.availableCredit, selectedPurchase.outstanding)
    : 0;

  const handleApply = async () => {
    if (!selectedCreditId || !selectedPurchaseId || amount <= 0) {
      toast.error("Please select a supplier credit, a purchase, and enter an amount");
      return;
    }
    if (amount > maxAmount + 0.01) {
      toast.error(`Amount cannot exceed ${formatPrice(maxAmount)}`);
      return;
    }
    try {
      setLoading(true);
      await axios.post(`/api/supplier-credits/${selectedCreditId}/apply`, {
        tourPackageQueryId,
        purchaseDetailId: selectedPurchaseId,
        amount
      });
      toast.success(`Supplier credit applied: ${formatPrice(amount)}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data || "Failed to apply supplier credit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Apply Supplier Credit
          </DialogTitle>
          <DialogDescription>
            Apply a supplier rebooking credit to reduce the outstanding payable on this tour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Supplier Selector */}
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Credit Selector */}
          <div className="space-y-1.5">
            <Label>Select Supplier Credit</Label>
            <Select
              value={selectedCreditId}
              onValueChange={(v) => {
                setSelectedCreditId(v);
                const sc = supplierCredits.find(c => c.id === v);
                if (selectedPurchase && sc) {
                  setAmount(parseFloat(Math.min(sc.availableCredit, selectedPurchase.outstanding).toFixed(2)));
                }
              }}
              disabled={!selectedSupplierId || fetchingCredits}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetchingCredits ? "Loading..." : "Select a supplier credit..."} />
              </SelectTrigger>
              <SelectContent>
                {supplierCredits.length === 0 ? (
                  <SelectItem value="_none" disabled>No available credits for this supplier</SelectItem>
                ) : (
                  supplierCredits.map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.originalTour} — {formatPrice(sc.availableCredit)} available
                      {sc.daysUntilExpiry !== null && sc.daysUntilExpiry <= 30 && (
                        <span className="text-amber-600 ml-2">(expires in {sc.daysUntilExpiry}d)</span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedCredit && (
              <p className="text-xs text-muted-foreground">
                Original: {formatPrice(selectedCredit.amount)} &bull; Available: {formatPrice(selectedCredit.availableCredit)}
                {selectedCredit.supplierCreditExpiry && (
                  <> &bull; Expires: {format(new Date(selectedCredit.supplierCreditExpiry), 'dd MMM yyyy')}</>
                )}
                {selectedCredit.returnReason && <> &bull; {selectedCredit.returnReason}</>}
              </p>
            )}
          </div>

          {/* Purchase Selector */}
          <div className="space-y-1.5">
            <Label>Apply to Purchase</Label>
            <Select
              value={selectedPurchaseId}
              onValueChange={(v) => {
                setSelectedPurchaseId(v);
                const p = purchases.find(x => x.id === v);
                if (p && selectedCredit) {
                  setAmount(parseFloat(Math.min(selectedCredit.availableCredit, p.outstanding).toFixed(2)));
                }
              }}
              disabled={fetchingPurchases}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetchingPurchases ? "Loading purchases..." : "Select a purchase..."} />
              </SelectTrigger>
              <SelectContent>
                {purchases.length === 0 ? (
                  <SelectItem value="_none" disabled>No outstanding purchases on this tour</SelectItem>
                ) : (
                  purchases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.supplier?.name || 'Unknown'}{p.billNumber ? ` — Bill# ${p.billNumber}` : ''} — Outstanding: {formatPrice(p.outstanding)}
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
                  className="ml-2 text-blue-600 underline text-xs"
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
            disabled={loading || !selectedCreditId || !selectedPurchaseId || amount <= 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Applying..." : "Apply Supplier Credit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
