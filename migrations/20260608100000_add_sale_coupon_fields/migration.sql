-- AlterTable
ALTER TABLE `SaleDetail` ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `couponDiscountAmount` DOUBLE NULL,
    ADD COLUMN `couponRedemptionId` VARCHAR(191) NULL,
    ADD COLUMN `preDiscountSalePrice` DOUBLE NULL;

-- CreateTable
CREATE TABLE `CouponCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `discountType` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discountValue` DOUBLE NOT NULL,
    `maxDiscountAmount` DOUBLE NULL,
    `minBookingAmount` DOUBLE NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `totalRedemptionLimit` INTEGER NULL,
    `perCustomerLimit` INTEGER NULL,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `approvalRequiredAboveAmount` DOUBLE NULL,
    `eligibilityRules` JSON NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `updatedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CouponCampaign_status_idx`(`status`),
    INDEX `CouponCampaign_startsAt_idx`(`startsAt`),
    INDEX `CouponCampaign_endsAt_idx`(`endsAt`),
    INDEX `CouponCampaign_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponCode` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `maxRedemptions` INTEGER NULL,
    `redeemedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CouponCode_code_key`(`code`),
    INDEX `CouponCode_campaignId_idx`(`campaignId`),
    INDEX `CouponCode_status_idx`(`status`),
    INDEX `CouponCode_redeemedCount_idx`(`redeemedCount`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `couponCodeId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'VALIDATED', 'APPROVAL_REQUIRED', 'APPROVED', 'APPLIED', 'REJECTED', 'VOIDED') NOT NULL DEFAULT 'REQUESTED',
    `inquiryId` VARCHAR(191) NULL,
    `tourPackageQueryId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `customerMobile` VARCHAR(191) NULL,
    `travelAppUserId` VARCHAR(191) NULL,
    `originalBookingAmount` DOUBLE NULL,
    `discountAmount` DOUBLE NULL,
    `taxableAmountAfterDiscount` DOUBLE NULL,
    `gstAfterDiscount` DOUBLE NULL,
    `validationMessage` TEXT NULL,
    `approvalNotes` TEXT NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `appliedByUserId` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `appliedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CouponRedemption_campaignId_idx`(`campaignId`),
    INDEX `CouponRedemption_couponCodeId_idx`(`couponCodeId`),
    INDEX `CouponRedemption_code_idx`(`code`),
    INDEX `CouponRedemption_status_idx`(`status`),
    INDEX `CouponRedemption_inquiryId_idx`(`inquiryId`),
    INDEX `CouponRedemption_tourPackageQueryId_idx`(`tourPackageQueryId`),
    INDEX `CouponRedemption_customerMobile_idx`(`customerMobile`),
    INDEX `CouponRedemption_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SaleDetail_couponRedemptionId_key` ON `SaleDetail`(`couponRedemptionId`);

-- CreateIndex
CREATE INDEX `SaleDetail_couponCode_idx` ON `SaleDetail`(`couponCode`);
