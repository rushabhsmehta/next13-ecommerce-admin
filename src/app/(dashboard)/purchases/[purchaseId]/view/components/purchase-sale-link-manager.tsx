"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PurchaseSaleLinkManagerProps {
  purchaseId: string;
  linkedSales: any[];
}

const LINK_TYPES = ["hotel", "transport", "guide", "visa", "insurance", "misc"];

export function PurchaseSaleLinkManager({ purchaseId, linkedSales }: PurchaseSaleLinkManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [linkType, setLinkType] = useState("misc");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!saleId.trim()) {
      toast.error("Please enter a Sale ID");
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/sale-purchase-links', {
        saleDetailId: saleId.trim(),
        purchaseDetailId: purchaseId,
        linkType,
        note: note || null
      });
      toast.success("Sale linked successfully");
      setOpen(false);
      setSaleId("");
      setNote("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to link sale");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (saleDetailId: string) => {
    if (!confirm("Remove this link?")) return;
    try {
      await axios.delete(`/api/sale-purchase-links?saleDetailId=${saleDetailId}&purchaseDetailId=${purchaseId}`);
      toast.success("Link removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove link");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Linked Customer Sales</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Link Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link a Sale to this Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Sale ID</label>
                <Input
                  placeholder="Paste the Sale ID"
                  value={saleId}
                  onChange={e => setSaleId(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Navigate to the sale and copy the ID from the URL</p>
              </div>
              <div>
                <label className="text-sm font-medium">Link Type</label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Note (optional)</label>
                <Input
                  placeholder="e.g. Goa tour booking"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleLink} disabled={loading} className="w-full">
                <Link2 className="h-4 w-4 mr-1" />
                {loading ? "Linking..." : "Link Sale"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {linkedSales.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">
            No sales linked. Click &quot;Link Sale&quot; to connect customer invoices to this purchase.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {linkedSales.map(link => (
                <tr key={link.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${link.saleDetailId}/view`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {link.saleDetail.invoiceNumber || `#${link.saleDetailId.slice(0, 8)}`}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {new Date(link.saleDetail.saleDate).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="px-4 py-3">{link.saleDetail.customer?.name || '-'}</td>
                  <td className="px-4 py-3">
                    {link.linkType && (
                      <Badge variant="outline" className="text-xs">
                        {link.linkType}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice((link.saleDetail.salePrice || 0) + (link.saleDetail.gstAmount || 0))}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{link.note || '-'}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(link.saleDetailId)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
