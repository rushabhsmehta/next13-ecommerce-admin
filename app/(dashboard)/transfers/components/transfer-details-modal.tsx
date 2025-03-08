"use client";

import { useTransferModal } from './use-transfer-details-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { ArrowRightIcon, Building2, Wallet } from 'lucide-react';

export const TransferDetailsModal = () => {
  const transferModal = useTransferModal();
  const transfer = transferModal.transfer;

  if (!transfer) {
    return null;
  }

  return (
    <Dialog open={transferModal.isOpen} onOpenChange={transferModal.onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transfer Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col space-y-1.5">
            <div className="text-sm font-medium text-muted-foreground">Date</div>
            <div>{transfer.date}</div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <div className="text-sm font-medium text-muted-foreground">Amount</div>
            <div className="text-xl font-bold">{formatPrice(transfer.amount)}</div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <div className="text-sm font-medium text-muted-foreground">Accounts</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {transfer.fromType === "Bank" ? (
                  <Building2 className="h-4 w-4 mr-1 text-blue-600" />
                ) : (
                  <Wallet className="h-4 w-4 mr-1 text-green-600" />
                )}
                <span className="font-medium">{transfer.fromAccount}</span>
              </div>
              <ArrowRightIcon className="h-4 w-4" />
              <div className="flex items-center">
                {transfer.toType === "Bank" ? (
                  <Building2 className="h-4 w-4 mr-1 text-blue-600" />
                ) : (
                  <Wallet className="h-4 w-4 mr-1 text-green-600" />
                )}
                <span className="font-medium">{transfer.toAccount}</span>
              </div>
            </div>
          </div>

          {transfer.reference && (
            <div className="flex flex-col space-y-1.5">
              <div className="text-sm font-medium text-muted-foreground">Reference</div>
              <div>{transfer.reference}</div>
            </div>
          )}

          {transfer.description && (
            <div className="flex flex-col space-y-1.5">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div>{transfer.description}</div>
            </div>
          )}

          <div className="flex flex-col space-y-1.5">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <Badge variant="outline" className="w-fit">Completed</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
