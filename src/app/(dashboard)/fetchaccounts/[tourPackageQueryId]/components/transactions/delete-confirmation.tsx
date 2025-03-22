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
      const endpoint = `/api/${itemToDelete.type}s/${itemToDelete.id}`;
      await axios.delete(endpoint);
      toast.success(`${capitalizeFirstLetter(itemToDelete.type)} deleted successfully`);
      onConfirmDelete();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(`Failed to delete ${itemToDelete.type}`);
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected
            {itemToDelete?.type && ` ${itemToDelete.type}`} and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmation;