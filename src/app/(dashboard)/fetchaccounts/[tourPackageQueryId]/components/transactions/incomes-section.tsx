'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, Image as ImageIcon, Upload, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IncomeFormWrapper } from "@/components/forms/income-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, IncomeCategory, IncomeDetail } from '@prisma/client';
import ImageViewer from '@/components/ui/image-viewer';
import ImageUpload from '@/components/ui/image-upload';

// Extended the IncomeDetail to include images relationship
interface IncomeWithImages extends IncomeDetail {
    images?: { url: string }[];
}

interface IncomesSectionProps {
    incomesData: IncomeWithImages[];
    incomeCategories: IncomeCategory[];
    bankAccounts: BankAccount[];
    cashAccounts: CashAccount[];
    tourPackageId: string;
    tourPackageName: string;
    onRefresh: () => void;
    isRefreshing: boolean;
}

const IncomesSection: React.FC<IncomesSectionProps> = ({
    incomesData,
    incomeCategories,
    bankAccounts,
    cashAccounts,
    tourPackageId,
    tourPackageName, onRefresh,
    isRefreshing
}) => {    // Use state to track incomes data locally so we can update it immediately
    const [localIncomesData, setLocalIncomesData] = useState<IncomeWithImages[]>(incomesData);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    // States for image viewer and uploader
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [currentImages, setCurrentImages] = useState<string[]>([]);
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    // Update local state when the prop changes
    useEffect(() => {
        setLocalIncomesData(incomesData);
    }, [incomesData]);

    // Function to handle image viewing
    const handleViewImages = (income: IncomeWithImages) => {
        setCurrentImages(income.images?.map(img => img.url) || []);
        setIsImageViewerOpen(true);
    };    // Function to handle image deletion
    const handleDeleteImage = async (imageUrl: string): Promise<void> => {
        try {
            // Find the income that contains this image
            const income = localIncomesData.find(inc =>
                inc.images?.some(img => img.url === imageUrl)
            );

            if (!income) {
                throw new Error('Income not found for this image');
            }

            // Remove the image URL from the current income's images
            const updatedImages = income.images?.filter(img => img.url !== imageUrl).map(img => img.url) || [];

            // Prepare the updated data
            const incomeData = {
                incomeDate: income.incomeDate,
                amount: income.amount,
                incomeCategoryId: income.incomeCategoryId,
                description: income.description,
                tourPackageQueryId: income.tourPackageQueryId,
                bankAccountId: income.bankAccountId,
                cashAccountId: income.cashAccountId,
                images: updatedImages
            };

            // Update via API
            const response = await fetch(`/api/incomes/${income.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(incomeData),
            });

            if (!response.ok) {
                throw new Error('Failed to delete image');
            }

            toast.success('Image deleted successfully');

            // Update local state
            setLocalIncomesData(prevIncomes =>
                prevIncomes.map(inc =>
                    inc.id === income.id
                        ? { ...inc, images: updatedImages.map(url => ({ url })) }
                        : inc
                )
            );

            // Update current images for the viewer
            setCurrentImages(updatedImages);

            // Close image viewer if no images left
            if (updatedImages.length === 0) {
                setIsImageViewerOpen(false);
            }

        } catch (error) {
            console.error('Error deleting image:', error);
            toast.error('Failed to delete image');
            throw error; // Rethrow to indicate failure to the ImageViewer component
        }
    };    // Calculate totals
    const totalIncomes = localIncomesData.reduce((sum, income) => sum + income.amount, 0);

    // Function to handle edit
    const handleEdit = (income: any) => {
        setEditItem(income);
        setIsIncomeModalOpen(true);
    };

    // Function to handle delete
    const handleDelete = (id: string) => {
        setItemToDelete({ id, type: 'income' });
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-green-800">Income Records</h3>
                <div className="flex items-center space-x-2">                    <Badge variant="outline" className="text-green-800 border-green-800">
                    {localIncomesData.length} records
                </Badge>
                    <Button
                        onClick={() => {
                            setEditItem(null);
                            setIsIncomeModalOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-1" />
                        Add Income
                    </Button>
                </div>
            </div>

            {localIncomesData.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-green-500">
                    <CardHeader className="py-3 bg-gray-50">                        <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4">
                        <div>Category</div>
                        <div>Date</div>
                        <div>Account Type</div>
                        <div>Account Name</div>
                        <div>Amount</div>
                        <div>Description</div>
                        <div>Actions</div>
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                        {localIncomesData.map((income) => {
                            const isBank = !!income.bankAccountId;
                            const accountType = isBank ? "Bank" : income.cashAccountId ? "Cash" : "-";
                            const accountName = isBank
                                ? bankAccounts.find(b => b.id === income.bankAccountId)?.accountName || "-"
                                : income.cashAccountId
                                    ? cashAccounts.find(c => c.id === income.cashAccountId)?.accountName || "-"
                                    : "-";
                            return (<div key={income.id}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                                <div className="font-medium flex items-center">
                                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                                    {incomeCategories.find(cat => cat.id === income.incomeCategoryId)?.name || 'N/A'}
                                </div>
                                <div className="flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                                    {format(new Date(income.incomeDate), "dd MMM yyyy")}
                                </div>
                                <div>{accountType}</div>
                                <div>{accountName}</div>
                                <div className="font-bold text-green-700">
                                    <div>{formatPrice(income.amount)}</div>
                                </div>
                                <div className="truncate text-gray-600">{income.description || 'No description'}</div>
                                <div className="flex justify-center">
                                    <div className="flex space-x-1">
                                        {income.images && income.images.length > 0 ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewImages(income)}
                                                className="h-7 w-7 p-0"
                                                title="View Images"
                                            >
                                                <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                                            </Button>
                                        ) : null}
                                        <CldUploadWidget
                                            uploadPreset="ckwg6oej"
                                            onSuccess={(result: any) => {
                                                if (result.info && result.info.secure_url) {
                                                    const url = result.info.secure_url;

                                                    // Set this income as currently uploading
                                                    setUploadingImageId(income.id);

                                                    // Prepare data for upload
                                                    const incomeData = {
                                                        incomeDate: income.incomeDate,
                                                        amount: income.amount,
                                                        incomeCategoryId: income.incomeCategoryId,
                                                        description: income.description,
                                                        tourPackageQueryId: income.tourPackageQueryId,
                                                        bankAccountId: income.bankAccountId,
                                                        cashAccountId: income.cashAccountId,
                                                        images: [...(income.images?.map(img => img.url) || []), url]
                                                    };

                                                    // Update directly
                                                    fetch(`/api/incomes/${income.id}`, {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify(incomeData),
                                                    })
                                                        .then(response => {
                                                            if (!response.ok) {
                                                                throw new Error('Failed to upload image');
                                                            }
                                                            toast.success('Image uploaded successfully');

                                                            // Update local state immediately to show the view button
                                                            setLocalIncomesData(prevIncomes =>
                                                                prevIncomes.map(inc =>
                                                                    inc.id === income.id
                                                                        ? { ...inc, images: [...(inc.images || []), { url }] }
                                                                        : inc
                                                                )
                                                            );
                                                        })
                                                        .catch(error => {
                                                            console.error('Error uploading image:', error);
                                                            toast.error('Failed to upload image');
                                                        })
                                                        .finally(() => {
                                                            setUploadingImageId(null);
                                                        });
                                                }
                                            }}
                                        >
                                            {({ open }) => {
                                                return (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => open?.()}
                                                        className="h-7 w-7 p-0"
                                                        title="Upload Image"
                                                        disabled={uploadingImageId === income.id}
                                                    >
                                                        <Upload className={`h-3.5 w-3.5 text-blue-600 ${uploadingImageId === income.id ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                );
                                            }}
                                        </CldUploadWidget>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(income)}
                                            className="h-7 w-7 p-0"
                                        >
                                            <Edit className="h-3.5 w-3.5 text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(income.id)}
                                            className="h-7 w-7 p-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </CardContent>
                    <CardContent className="border-t bg-gray-50 py-2">
                        <div className="flex justify-end items-center space-x-4">
                            <div className="text-sm">
                                <span className="text-gray-500">Total Incomes:</span>
                                <span className="ml-2 font-bold text-green-700">{formatPrice(totalIncomes)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-gray-500 italic">No income records available</p>
            )}

            {/* Income Entry/Edit Dialog */}
            <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editItem ? "Edit Income" : "Add New Income"}
                        </DialogTitle>
                        <DialogDescription>
                            {editItem ? "Edit income details" : "Create a new income for this tour package."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        <IncomeFormWrapper
                            initialData={editItem || {
                                tourPackageQueryId: tourPackageId,
                                tourPackageQuery: {
                                    tourPackageQueryName: tourPackageName
                                }
                            }}
                            incomeCategories={incomeCategories}
                            bankAccounts={bankAccounts}
                            cashAccounts={cashAccounts}
                            onSuccess={() => {
                                setIsIncomeModalOpen(false);
                                onRefresh();
                                toast.success(editItem ? "Income updated successfully" : "Income created successfully");
                            }}
                            submitButtonText={editItem ? "Update Income" : "Create Income"}
                        />
                    </div>
                </DialogContent>
            </Dialog>            {/* Delete Confirmation Dialog */}
            <DeleteConfirmation
                isOpen={isDeleteDialogOpen}
                setIsOpen={setIsDeleteDialogOpen}
                itemToDelete={itemToDelete}
                onConfirmDelete={onRefresh}
            />

            {/* Image Viewer Dialog */}
            <ImageViewer
                images={currentImages}
                open={isImageViewerOpen}
                onOpenChange={setIsImageViewerOpen}
                onDelete={handleDeleteImage}
            />
        </div>
    );
};

export default IncomesSection;