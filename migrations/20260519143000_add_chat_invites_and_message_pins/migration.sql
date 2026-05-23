-- AlterTable
ALTER TABLE `ChatGroupMember` ADD COLUMN `notificationsMuted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ChatMessage` ADD COLUMN `isAnnouncement` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isImportant` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pinnedAt` DATETIME(3) NULL,
    ADD COLUMN `pinnedById` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ChatGroupInvite` (
    `id` VARCHAR(191) NOT NULL,
    `chatGroupId` VARCHAR(191) NOT NULL,
    `invitedName` VARCHAR(191) NOT NULL,
    `invitedEmail` VARCHAR(191) NULL,
    `invitedPhone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'OPERATIONS', 'TOURIST', 'COMPANION') NOT NULL DEFAULT 'TOURIST',
    `status` ENUM('PENDING', 'ACCEPTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `invitedBy` VARCHAR(191) NOT NULL,
    `acceptedTravelAppUserId` VARCHAR(191) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChatGroupInvite_chatGroupId_idx`(`chatGroupId`),
    INDEX `ChatGroupInvite_chatGroupId_status_idx`(`chatGroupId`, `status`),
    INDEX `ChatGroupInvite_invitedEmail_idx`(`invitedEmail`),
    INDEX `ChatGroupInvite_invitedPhone_idx`(`invitedPhone`),
    INDEX `ChatGroupInvite_acceptedTravelAppUserId_idx`(`acceptedTravelAppUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ChatMessage_chatGroupId_isPinned_createdAt_idx` ON `ChatMessage`(`chatGroupId`, `isPinned`, `createdAt`);