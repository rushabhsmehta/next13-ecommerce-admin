-- Drop TourPackageQuery general pricing columns after migrating data into variantPricingData.
-- Run tools/migrate-tpq-general-pricing-to-variants.mjs BEFORE applying this migration.

ALTER TABLE `TourPackageQuery` DROP COLUMN `price`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricePerAdult`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricePerChild5to12YearsNoBed`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricePerChildOrExtraBed`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricePerChildwithSeatBelow5Years`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `totalPrice`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricingSection`;
ALTER TABLE `TourPackageQuery` DROP COLUMN `pricingCalculationMethod`;
