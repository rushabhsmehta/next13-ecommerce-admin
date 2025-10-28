-- Performance indexes for TourPackageQuery table
-- Run this script carefully in production

-- Add indexes one by one to avoid locking issues
-- These indexes will dramatically improve query performance

-- Index for updatedAt (used in ORDER BY)
CREATE INDEX IF NOT EXISTS `TourPackageQuery_updatedAt_idx` ON `TourPackageQuery`(`updatedAt`);

-- Index for isArchived (frequently used in WHERE)
CREATE INDEX IF NOT EXISTS `TourPackageQuery_isArchived_idx` ON `TourPackageQuery`(`isArchived`);

-- Compound index for location + archived + updated queries
CREATE INDEX IF NOT EXISTS `TourPackageQuery_locationId_isArchived_updatedAt_idx` ON `TourPackageQuery`(`locationId`, `isArchived`, `updatedAt`);

-- Index for tourPackageQueryNumber (used in search)
CREATE INDEX IF NOT EXISTS `TourPackageQuery_tourPackageQueryNumber_idx` ON `TourPackageQuery`(`tourPackageQueryNumber`);

-- Index for customerNumber (used in search)
CREATE INDEX IF NOT EXISTS `TourPackageQuery_customerNumber_idx` ON `TourPackageQuery`(`customerNumber`);

-- Index for AssociatePartner isActive
CREATE INDEX IF NOT EXISTS `AssociatePartner_isActive_idx` ON `AssociatePartner`(`isActive`);

-- Index for AssociatePartner createdAt
CREATE INDEX IF NOT EXISTS `AssociatePartner_createdAt_idx` ON `AssociatePartner`(`createdAt`);

-- Index for Location isActive
CREATE INDEX IF NOT EXISTS `Location_isActive_idx` ON `Location`(`isActive`);

-- Index for Location label
CREATE INDEX IF NOT EXISTS `Location_label_idx` ON `Location`(`label`);

-- Add value column if it doesn't exist
ALTER TABLE `Location` ADD COLUMN IF NOT EXISTS `value` VARCHAR(191) NULL;
