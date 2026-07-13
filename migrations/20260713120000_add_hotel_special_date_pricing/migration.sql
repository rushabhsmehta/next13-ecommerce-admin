-- CreateTable
CREATE TABLE `HotelSpecialDatePricing` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `price` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `occupancyTypeId` VARCHAR(191) NOT NULL,
    `mealPlanId` VARCHAR(191) NULL,

    INDEX `HotelSpecialDatePricing_hotelId_idx`(`hotelId`),
    INDEX `HotelSpecialDatePricing_hotelId_startDate_endDate_idx`(`hotelId`, `startDate`, `endDate`),
    INDEX `HotelSpecialDatePricing_hotelId_roomTypeId_occupancyTypeId_m_idx`(`hotelId`, `roomTypeId`, `occupancyTypeId`, `mealPlanId`),
    INDEX `HotelSpecialDatePricing_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
