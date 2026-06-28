-- CreateTable
CREATE TABLE `DevicePushToken` (
    `id` VARCHAR(191) NOT NULL,
    `expoPushToken` VARCHAR(500) NOT NULL,
    `platform` VARCHAR(191) NULL,
    `appVariant` VARCHAR(191) NOT NULL DEFAULT 'public',
    `travelAppUserId` VARCHAR(191) NULL,
    `marketingOptIn` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DevicePushToken_expoPushToken_key`(`expoPushToken`),
    INDEX `DevicePushToken_travelAppUserId_idx`(`travelAppUserId`),
    INDEX `DevicePushToken_isActive_appVariant_idx`(`isActive`, `appVariant`),
    INDEX `DevicePushToken_marketingOptIn_idx`(`marketingOptIn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingPushBroadcast` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `data` JSON NULL,
    `sentBy` VARCHAR(191) NOT NULL,
    `recipientCount` INTEGER NOT NULL DEFAULT 0,
    `ticketOkCount` INTEGER NOT NULL DEFAULT 0,
    `ticketErrorCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingPushBroadcast_createdAt_idx`(`createdAt`),
    INDEX `MarketingPushBroadcast_sentBy_idx`(`sentBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DevicePushToken` ADD CONSTRAINT `DevicePushToken_travelAppUserId_fkey` FOREIGN KEY (`travelAppUserId`) REFERENCES `TravelAppUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
