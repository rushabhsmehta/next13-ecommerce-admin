'use client'

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  itemToDelete: {
    id: string;
    type: string;
  } | null;
  onConfirmDelete: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  setIsOpen,
  itemToDelete,
  onConfirmDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      let endpoint = '';
      switch (itemToDelete.type) {
        case 'sale':
          endpoint = `/api/sales/${itemToDelete.id}`;
          break;
        case 'purchase':
          endpoint = `/api/purchases/${itemToDelete.id}`;
          break;
        case 'payment':
          endpoint = `/api/payments/${itemToDelete.id}`;
          break;
        case 'receipt':
          endpoint = `/api/receipts/${itemToDelete.id}`;
          break;
        case 'expense':
          endpoint = `/api/expenses/${itemToDelete.id}`;
          break;
        case 'income':
          endpoint = `/api/incomes/${itemToDelete.id}`;
          break;
        default:
          toast.error('Unknown item type');
          setIsDeleting(false);
          setIsOpen(false);
          return;
      }

      await axios.delete(endpoint);
      toast.success(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully`);
      onConfirmDelete();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to delete ${itemToDelete.type}`);
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the 
            {itemToDelete?.type && ` ${itemToDelete.type}`} record from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmation;