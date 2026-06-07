-- AlterTable
ALTER TABLE `TourPackage` ADD COLUMN `isOffer` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `offerBadge` VARCHAR(191) NULL,
    ADD COLUMN `offerEndsAt` DATETIME(3) NULL,
    ADD COLUMN `offerOriginalPrice` VARCHAR(191) NULL,
    ADD COLUMN `offerPrice` VARCHAR(191) NULL,
    ADD COLUMN `offerSortOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `offerStartsAt` DATETIME(3) NULL,
    ADD COLUMN `offerSubtitle` TEXT NULL,
    ADD COLUMN `offerTerms` JSON NULL,
    ADD COLUMN `offerTitle` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `TourPackage_isOffer_idx` ON `TourPackage`(`isOffer`);

-- CreateIndex
CREATE INDEX `TourPackage_offerSortOrder_idx` ON `TourPackage`(`offerSortOrder`);

-- CreateIndex
CREATE INDEX `TourPackage_offerStartsAt_idx` ON `TourPackage`(`offerStartsAt`);

-- CreateIndex
CREATE INDEX `TourPackage_offerEndsAt_idx` ON `TourPackage`(`offerEndsAt`);
