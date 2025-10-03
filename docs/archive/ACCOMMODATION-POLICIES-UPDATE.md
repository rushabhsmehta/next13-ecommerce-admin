# Update Accommodation Policies Script

This script updates all existing records in the database with the new accommodation policies.

## What it updates:

### Old Policy:
```
"Accommodation in preferred Hotel"
```

### New Policies:
```
"Accommodation in standard rooms"
"For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable"
```

## Affected Tables:
- **Locations** - Updates the `inclusions` field
- **Tour Packages** - Updates the `inclusions` field  
- **Tour Package Queries** - Updates the `inclusions` field

## How to run:

### Option 1: Using npm script (Recommended)
```bash
npm run update-accommodation-policies
```

### Option 2: Direct node execution
```bash
node update-accommodation-policies.js
```

## What the script does:

1. **Finds records** with the old accommodation text
2. **Replaces** the old text with the new accommodation policies
3. **Preserves** all other existing inclusions
4. **Adds new policies** if no accommodation policy exists
5. **Skips records** that already have the updated policies
6. **Shows progress** and summary of updates

## Sample Output:
```
🚀 Starting accommodation policies update...
🏢 Updating Locations...
✅ Updated location: Kashmir Valley Tour
✅ Updated location: Goa Beach Holiday
📍 Locations: 15 updated out of 20

📦 Updating Tour Packages...
✅ Updated tour package: 7 Days Kashmir Package
✅ Updated tour package: 5 Days Goa Package
📦 Tour Packages: 8 updated out of 12

🔍 Updating Tour Package Queries...
✅ Updated query: Kashmir Valley Query
✅ Updated query: Goa Beach Query
🔍 Tour Package Queries: 12 updated out of 18

✅ SUMMARY:
📍 Locations updated: 15/20
📦 Tour Packages updated: 8/12
🔍 Tour Package Queries updated: 12/18

🎉 All accommodation policies updated successfully!
```

## Safety Features:
- ✅ **No data loss** - Preserves all existing inclusions
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Progress tracking** - Shows what's being updated
- ✅ **Error handling** - Continues if individual updates fail
- ✅ **Backup recommended** - Always backup before running

## Before Running:
1. **Backup your database** (recommended)
2. **Test on staging** environment first (if available)
3. **Close the application** to avoid conflicts during updates

## After Running:
- All new forms will use the updated policies automatically
- Existing records will now show the new accommodation policies
- Users will see consistent messaging across all modules
