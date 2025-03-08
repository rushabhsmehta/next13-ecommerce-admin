import { create } from 'zustand';
import { TransferColumn } from './columns';

interface TransferModal {
  isOpen: boolean;
  transfer: TransferColumn | null;
  onOpen: () => void;
  onClose: () => void;
  setTransfer: (transfer: TransferColumn) => void;
}

export const useTransferModal = create<TransferModal>((set) => ({
  isOpen: false,
  transfer: null,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
  setTransfer: (transfer) => set({ transfer }),
}));
