# Scripts Directory

> **Organized collection of utility scripts, migrations, tests, and seed data**

---

## 📂 Directory Structure

```
scripts/
├── migrations/      # Database migrations and data fixes
├── tests/          # API and feature tests
├── whatsapp/       # WhatsApp integration scripts
├── seed/           # Database seeding scripts
└── utilities/      # General utility scripts
```

---

## 📁 Folder Descriptions

### `/migrations` (6 files)
Database migrations and data transformation scripts:
- `migrate-transportation-field.js` - Transport field migration
- `migrate-transportation-to-vehicletype.js` - Vehicle type migration
- `update-accommodation-policies.js` - Update accommodation policies
- `update-slug.js` - Update URL slugs
- `fix-orphaned-mappings.js` - Clean up orphaned hotel mappings
- `fix-tour-categories.js` - Fix tour package categories

**Usage**:
```bash
node scripts/migrations/migrate-transportation-field.js
```

---

### `/tests` (20 files)
API and feature testing scripts:

#### API Tests
- `test-destination-api.js` - Destination API tests
- `test-receipt-api.js` - Receipt API tests
- `test-seasonal-api.js` - Seasonal pricing API tests
- `test-tourpackagequery-api.js` - Tour package query API tests
- `test-variants-api.js` - Variants API tests

#### Feature Tests
- `test-accommodation-update.js` - Accommodation updates
- `test-bulk-pricing.js` - Bulk pricing features
- `test-bulk-pricing-simple.js` - Simplified bulk pricing
- `test-hotel-destination-linking.js` - Hotel-destination links
- `test-inline-editing.js` - Inline editing functionality
- `test-inquiry-room-allocation.js` - Room allocation in inquiries
- `test-item-ordering.js` - Item ordering functionality
- `test-message-recording.js` - Message recording
- `test-order-preservation.js` - Order preservation
- `test-vehicle-type-integration.js` - Vehicle type integration

#### Database Tests
- `test-prisma-models.js` - Prisma model tests

#### Timezone/UTC Tests
- `test-timezone-fix.js` - Timezone fixes
- `test-timezone-utils.js` - Timezone utility functions
- `test-utc-fixes.js` - UTC fixes validation
- `test-utc-validation.js` - UTC validation tests

**Usage**:
```bash
node scripts/tests/test-variants-api.js
```

---

### `/whatsapp` (6 files)
WhatsApp Business API integration scripts:
- `send-whatsapp.js` - Send WhatsApp messages
- `send-template-direct.js` - Send template messages directly
- `test-whatsapp.js` - WhatsApp functionality tests
- `test-whatsapp-db.js` - WhatsApp database tests
- `test-whatsapp-templates.js` - Template tests
- `seed-whatsapp-templates.js` - Seed WhatsApp templates
- `create-send-pdf-template.ts` - Downloads a PDF, uploads it to Meta's template media endpoint, and submits the `send_pdf` DOCUMENT-header template
- `TEMPLATE_VARIABLES_REFERENCE.js` - Template variables reference

**Usage**:
```bash
# Send a WhatsApp message
node scripts/whatsapp/send-whatsapp.js

# Seed templates
node scripts/whatsapp/seed-whatsapp-templates.js

# Create the send_pdf template with a document header
npx tsx scripts/whatsapp/create-send-pdf-template.ts
```

**Reference**:
See `TEMPLATE_VARIABLES_REFERENCE.js` for available template variables.

---

### `/seed` (2 files)
Database seeding scripts:
- `seed-seasonal-periods.js` - Seed seasonal pricing periods
- `seed-whatsapp-templates.js` - Seed WhatsApp templates

**Usage**:
```bash
node scripts/seed/seed-seasonal-periods.js
```

---

### `/utilities` (10 files)
General utility and validation scripts:

#### Database Checks
- `check-current-db.js` - Check current database state
- `check-room-types.js` - Verify room types
- `check-room-types.mjs` - Room types check (ES module)
- `check-structure.js` - Database structure validation
- `check-tables.js` - Table existence checks
- `check-variant-state.js` - Check variant data state

#### Data Operations
- `categorize-tour-packages.js` - Categorize tour packages

#### Validation
- `validate-all-utc-fixes.js` - Validate UTC fixes
- `validate-seasonal-pricing.js` - Validate seasonal pricing data

#### Utilities
- `move-docs-to-archive.ps1` - Documentation organization script

**Usage**:
```bash
# Check database
node scripts/utilities/check-current-db.js

# Validate UTC fixes
node scripts/utilities/validate-all-utc-fixes.js

# Run PowerShell utility
.\scripts\utilities\move-docs-to-archive.ps1
```

---

## 🚀 Common Commands

### Run a Script
```bash
# Node.js scripts
node scripts/<category>/<script-name>.js

# ES modules
node scripts/<category>/<script-name>.mjs

# PowerShell scripts
.\scripts\<category>\<script-name>.ps1
```

### Run All Tests
```bash
# Run all test scripts (example pattern)
Get-ChildItem scripts/tests/*.js | ForEach-Object { node $_.FullName }
```

### Run All Migrations
```bash
# Run migrations in order (be careful!)
node scripts/migrations/migrate-transportation-field.js
node scripts/migrations/migrate-transportation-to-vehicletype.js
# ... etc
```

---

## 📋 Script Categories Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Migrations | 6 | Database migrations & fixes |
| Tests | 20 | API & feature testing |
| WhatsApp | 6 | WhatsApp integration |
| Seed | 2 | Database seeding |
| Utilities | 10 | General utilities & validation |
| **TOTAL** | **44** | **All organized scripts** |

---

## ⚠️ Important Notes

### Before Running Migrations
1. **Backup your database** before running any migration scripts
2. Test in development environment first
3. Review the script code to understand what it does
4. Check for any dependencies or prerequisites

### Environment Variables
Most scripts require environment variables to be set:
```bash
# .env file should contain:
DATABASE_URL=...
# Other required variables
```

### Error Handling
- Scripts may fail if database is in unexpected state
- Check error messages carefully
- Some scripts are idempotent (safe to run multiple times)
- Some scripts modify data permanently

---

## 🔧 Development

### Adding New Scripts

1. **Choose the right category**:
   - Database changes? → `/migrations`
   - Testing features? → `/tests`
   - WhatsApp related? → `/whatsapp`
   - Seeding data? → `/seed`
   - General utility? → `/utilities`

2. **Follow naming conventions**:
   - Migrations: `migrate-*.js`, `fix-*.js`, `update-*.js`
   - Tests: `test-*.js`
   - Seeds: `seed-*.js`
   - Utilities: `check-*.js`, `validate-*.js`

3. **Add documentation**:
   - Add comments in the script
   - Update this README if significant

---

## 📚 Related Documentation

- [Database Migrations](../docs/guides/migrations.md) (future)
- [Testing Guide](../docs/guides/testing.md) (future)
- [WhatsApp Integration](../docs/features/whatsapp-integration.md) (future)

---

## 📊 Migration History

Scripts organized on: **October 3, 2025**
- Total scripts: 44
- Reduced root clutter by 44 files
- Organized into 5 logical categories

---

## 🤝 Contributing

When adding new scripts:
1. Place in appropriate category folder
2. Follow naming conventions
3. Add error handling
4. Document usage in script comments
5. Update this README if needed

---

**Last Updated**: October 3, 2025  
**Status**: ✅ All scripts organized
