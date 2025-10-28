# Quick Index Migration Guide

## IMPORTANT: Run this on production database AFTER deploying the code

## Prerequisites
- Code changes already deployed
- Database backup completed
- Access to production MySQL database

## Steps

### 1. Connect to Database
```bash
mysql -h metro.proxy.rlwy.net -P 46227 -u root -p railway
```

### 2. Verify Current Indexes
```sql
-- Check existing indexes on TourPackageQuery
SHOW INDEXES FROM TourPackageQuery;

-- Check existing indexes on AssociatePartner
SHOW INDEXES FROM AssociatePartner;

-- Check existing indexes on Location
SHOW INDEXES FROM Location;
```

### 3. Add Indexes One by One
```sql
-- TourPackageQuery indexes
CREATE INDEX `TourPackageQuery_updatedAt_idx` ON `TourPackageQuery`(`updatedAt`);
CREATE INDEX `TourPackageQuery_isArchived_idx` ON `TourPackageQuery`(`isArchived`);
CREATE INDEX `TourPackageQuery_locationId_isArchived_updatedAt_idx` ON `TourPackageQuery`(`locationId`, `isArchived`, `updatedAt`);
CREATE INDEX `TourPackageQuery_tourPackageQueryNumber_idx` ON `TourPackageQuery`(`tourPackageQueryNumber`);
CREATE INDEX `TourPackageQuery_customerNumber_idx` ON `TourPackageQuery`(`customerNumber`);

-- AssociatePartner indexes
CREATE INDEX `AssociatePartner_isActive_idx` ON `AssociatePartner`(`isActive`);
CREATE INDEX `AssociatePartner_createdAt_idx` ON `AssociatePartner`(`createdAt`);

-- Location indexes
CREATE INDEX `Location_isActive_idx` ON `Location`(`isActive`);
CREATE INDEX `Location_label_idx` ON `Location`(`label`);
```

### 4. Verify Indexes Were Created
```sql
-- Check TourPackageQuery indexes
SHOW INDEXES FROM TourPackageQuery WHERE Key_name LIKE '%idx';

-- Expected output: 5 new indexes
-- - TourPackageQuery_updatedAt_idx
-- - TourPackageQuery_isArchived_idx
-- - TourPackageQuery_locationId_isArchived_updatedAt_idx
-- - TourPackageQuery_tourPackageQueryNumber_idx
-- - TourPackageQuery_customerNumber_idx

-- Check AssociatePartner indexes
SHOW INDEXES FROM AssociatePartner WHERE Key_name LIKE '%idx';

-- Expected output: 2 new indexes
-- - AssociatePartner_isActive_idx
-- - AssociatePartner_createdAt_idx

-- Check Location indexes
SHOW INDEXES FROM Location WHERE Key_name LIKE '%idx';

-- Expected output: 2 new indexes (plus existing id index)
-- - Location_isActive_idx
-- - Location_label_idx
```

### 5. Test Query Performance
```sql
-- Test the optimized list query
EXPLAIN SELECT 
  id, tourPackageQueryNumber, tourPackageQueryName, 
  tourPackageQueryType, customerName, assignedTo,
  isFeatured, isArchived, customerNumber, tourStartsFrom, updatedAt
FROM TourPackageQuery
WHERE isArchived = false
ORDER BY updatedAt DESC
LIMIT 100;

-- Look for "Using index" in the Extra column
-- Key should show one of our new indexes
```

## Verification Checklist

After adding indexes:

- [ ] All 9 indexes created successfully (5 + 2 + 2)
- [ ] EXPLAIN query shows "Using index"
- [ ] No errors in MySQL log
- [ ] Test the /tourPackageQuery page - should load in < 1 second
- [ ] Test clicking Update - should open in < 2 seconds
- [ ] Search functionality still works
- [ ] No errors in application logs

## Troubleshooting

### If index creation fails:
```sql
-- Check for existing index with same name
SHOW INDEXES FROM TourPackageQuery WHERE Key_name = 'TourPackageQuery_updatedAt_idx';

-- If exists, drop it first
DROP INDEX `TourPackageQuery_updatedAt_idx` ON `TourPackageQuery`;

-- Then recreate
CREATE INDEX `TourPackageQuery_updatedAt_idx` ON `TourPackageQuery`(`updatedAt`);
```

### If table is locked:
- Wait a few minutes and retry
- Check for long-running queries: `SHOW PROCESSLIST;`
- Kill blocking queries if necessary: `KILL <process_id>;`

### If performance doesn't improve:
1. Verify indexes exist: `SHOW INDEXES FROM TourPackageQuery;`
2. Check if indexes are being used: `EXPLAIN <query>;`
3. Analyze table: `ANALYZE TABLE TourPackageQuery;`
4. Check application code was deployed

## Rollback (If Needed)

To remove all indexes:
```sql
DROP INDEX `TourPackageQuery_updatedAt_idx` ON `TourPackageQuery`;
DROP INDEX `TourPackageQuery_isArchived_idx` ON `TourPackageQuery`;
DROP INDEX `TourPackageQuery_locationId_isArchived_updatedAt_idx` ON `TourPackageQuery`;
DROP INDEX `TourPackageQuery_tourPackageQueryNumber_idx` ON `TourPackageQuery`;
DROP INDEX `TourPackageQuery_customerNumber_idx` ON `TourPackageQuery`;
DROP INDEX `AssociatePartner_isActive_idx` ON `AssociatePartner`;
DROP INDEX `AssociatePartner_createdAt_idx` ON `AssociatePartner`;
DROP INDEX `Location_isActive_idx` ON `Location`;
DROP INDEX `Location_label_idx` ON `Location`;
```

## Notes

- Index creation is **non-blocking** on MySQL 5.7+ (uses ALGORITHM=INPLACE)
- Each index takes ~1-5 seconds to create depending on table size
- Total time: < 1 minute for all indexes
- Indexes improve read performance, minimal impact on writes
- Safe to run during normal business hours

## Success Criteria

✅ All indexes created  
✅ EXPLAIN shows index usage  
✅ Page loads in < 1 second  
✅ Update form opens in < 2 seconds  
✅ No errors in logs  

**Date**: 2025-10-28  
**Estimated Time**: 5-10 minutes  
**Risk Level**: Low (non-breaking, easily reversible)
