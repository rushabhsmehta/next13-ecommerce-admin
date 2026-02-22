"use client";

import axios from "axios";
import { Copy, Edit, MoreHorizontal, Trash, Eye, Layers } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { TourPackageQueryVariantDisplayColumn } from "./columns";

interface CellActionProps {
    data: TourPackageQueryVariantDisplayColumn;
    readOnly?: boolean;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    readOnly = false,
}) => {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const router = useRouter();
    const params = useParams();

    const onConfirm = async () => {
        try {
            setLoading(true);
            await axios.delete(`/api/tourPackageQuery/${data.id}`);
            toast.success('Tour Package Query deleted.');
            router.refresh();
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success('Tour Package Query ID copied to clipboard.');
    }

    const handleViewVariantDisplay = (selectedOption: string) => {
        window.open(`/tourPackageQueryVariantDisplay/${data.id}?search=${selectedOption}`, "_blank");
    }

    const handleOptionConfirmPDF = (selectedOption: string) => {
        window.open(`/tourPackageQueryPDFGeneratorWithVariants/${data.id}?search=${selectedOption}`, "_blank");
    }

    return (
        <>
            {!readOnly && (
                <AlertModal
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    onConfirm={onConfirm}
                    loading={loading}
                />
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onCopy(data.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Id
                    </DropdownMenuItem>

                    {!readOnly && (
                        <>
                            <DropdownMenuItem
                                onClick={() => router.push(`/tourPackageQuery/${data.id}`)}
                            >
                                <Edit className="mr-2 h-4 w-4" /> Update
                            </DropdownMenuItem>
                        </>
                    )}

                    {readOnly && (
                        <DropdownMenuItem
                            onClick={() => router.push(`/tourPackageQuery/${data.id}`)}
                        >
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Layers className="mr-2 h-4 w-4" /> View Variant Display
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-56">
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('Empty')}>
                                    Empty
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('AH')}>
                                    AH
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('KH')}>
                                    KH
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('MT')}>
                                    MT
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('SupplierA')}>
                                    Supplier - Title only
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleViewVariantDisplay('SupplierB')}>
                                    Supplier - with Details
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Edit className="mr-2 h-4 w-4" /> Download PDF with Variants
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-56">
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('Empty')}>
                                    Empty
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('AH')}>
                                    AH
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('KH')}>
                                    KH
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('MT')}>
                                    MT
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('SupplierA')}>
                                    Supplier - Title only
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('SupplierB')}>
                                    Supplier - with Details
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    {!readOnly && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setOpen(true)}>
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};
