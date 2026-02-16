# Database Schema Changes - February 2026

## Changes Made to schema.prisma

### 1. Changed Hotel.location onDelete Policy
**File**: `schema.prisma` line 98
**Change**: `onDelete: Cascade` → `onDelete: Restrict`
**Reason**: Prevent unintended mass deletion of hotels when a location is deleted

**Previous behavior**: Deleting a location would cascade delete ALL hotels in that location along with their:
- Images
- Seasonal pricing (HotelPricing records)
- Itinerary relationships
- Variant hotel mappings

**New behavior**: Deleting a location is now restricted if hotels exist. User must:
1. Manually reassign or delete hotels first
2. Then delete the location

### 2. Existing Schema Enhancements (from previous commit 4f3a91a)
- Added indexes on date fields: `paymentDate`, `receiptDate`, `expenseDate`, `incomeDate`
- Added `onDelete: SetNull` to HotelPricing optional relations (roomType, occupancyType, mealPlan)
- Added `onDelete: SetNull` to Hotel.destination

## Migration Instructions

Since this project uses `prisma db push` instead of migrations:

### Development Environment
```bash
npx prisma db push
```

### Production Environment
⚠️ **IMPORTANT**: Test on staging first!

```bash
# 1. Backup database
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql

# 2. Apply schema changes
npx prisma db push

# 3. Verify foreign key constraints
# The Hotel → Location relation will now have a RESTRICT constraint
# Attempting to delete a location with hotels will fail with FK error
```

## Rollback Instructions

If you need to revert this change:

1. Edit `schema.prisma` line 98 back to:
   ```prisma
   location  Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
   ```

2. Run `npx prisma db push` again

## Testing

After applying changes, verify:

```sql
-- Should fail with FK constraint error
DELETE FROM Location WHERE id = '<id-with-hotels>';

-- Should succeed (no hotels in this location)
DELETE FROM Location WHERE id = '<id-without-hotels>';
```
