-- CreateIndex
CREATE INDEX `TourPackageQuery_isFeatured_tourStartsFrom_idx` ON `TourPackageQuery`(`isFeatured`, `tourStartsFrom`);

-- CreateIndex
CREATE INDEX `PurchaseDetail_purchaseDate_idx` ON `PurchaseDetail`(`purchaseDate`);

-- CreateIndex
CREATE INDEX `SaleDetail_saleDate_idx` ON `SaleDetail`(`saleDate`);

-- CreateIndex
CREATE INDEX `Customer_contact_idx` ON `Customer`(`contact`);

-- CreateIndex
CREATE INDEX `Inquiry_status_createdAt_idx` ON `Inquiry`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `Inquiry_createdAt_idx` ON `Inquiry`(`createdAt`);

-- CreateIndex
CREATE INDEX `Inquiry_journeyDate_idx` ON `Inquiry`(`journeyDate`);

-- CreateIndex
CREATE INDEX `Inquiry_nextFollowUpDate_idx` ON `Inquiry`(`nextFollowUpDate`);

-- CreateIndex
CREATE INDEX `Inquiry_customerMobileNumber_idx` ON `Inquiry`(`customerMobileNumber`);

-- CreateIndex
CREATE INDEX `Transfer_transferDate_idx` ON `Transfer`(`transferDate`);