# Next13 E-Commerce Admin - Documentation

> **Note**: This documentation has been reorganized for better navigation. All feature documentation, fixes, and guides are now organized by topic.

## 📚 Table of Contents

### Features
- [Package Variants](./features/package-variants.md) - Multi-variant tour packages with hotel mappings
- [PDF Generation](./features/pdf-generation.md) - PDF generation with and without variants
- [Seasonal Pricing](./features/seasonal-pricing.md) - Location-based seasonal pricing system
- [Tour Packages](./features/tour-packages.md) - Tour package management and enhancements
- [WhatsApp Integration](./features/whatsapp-integration.md) - WhatsApp Business API integration

### Fixes & Improvements
- [Timezone & UTC Fixes](./fixes/timezone-utc-fixes.md) - Comprehensive timezone handling fixes
- [UI Component Fixes](./fixes/ui-component-fixes.md) - Combobox, Popover, and inline editing fixes
- [Database & Transaction Fixes](./fixes/database-transaction-fixes.md) - Transaction timeout and query fixes
- [Validation Fixes](./fixes/validation-fixes.md) - Phone number, Zod, and form validation fixes

### Architecture
- [Multi-Variant Design](./architecture/multi-variant-design.md) - Architecture for multi-variant tour packages
- [Database Schema](./architecture/database-schema.md) - Prisma schema and migrations

### Guides
- [Quick Start](./guides/quick-start.md) - Getting started with the project
- [Twilio Setup](./guides/twilio-setup.md) - Setting up Twilio for WhatsApp
- [Development Guide](./guides/development.md) - Development workflow and best practices

## 🚀 Quick Links

### For Developers
- [Quick Start Checklist](./guides/quick-start.md#checklist)
- [Common Issues & Solutions](./fixes/README.md)
- [Architecture Overview](./architecture/multi-variant-design.md)

### For Feature Documentation
- [Package Variants - Complete Guide](./features/package-variants.md)
- [PDF Generation - All Options](./features/pdf-generation.md)
- [Seasonal Pricing - Setup Guide](./features/seasonal-pricing.md)

## 📝 Recent Updates

### Latest Features (2025)
- ✅ **Package Variants with Hotel Mappings** - Complete multi-variant support
- ✅ **PDF Generation with Variants** - Comprehensive PDF with all sections
- ✅ **Seasonal Pricing** - Location-based multi-period pricing
- ✅ **Timezone Fixes** - Comprehensive UTC handling across the app

### Latest Fixes
- ✅ Transaction timeout fixes for Tour Package Query updates
- ✅ Combobox selection and display improvements
- ✅ Phone number validation with country code support
- ✅ Popover/Dialog z-index conflicts resolved

## 🏗️ Project Structure

```
next13-ecommerce-admin/
├── docs/                    # 📚 Documentation (you are here)
│   ├── features/           # Feature documentation
│   ├── fixes/              # Bug fixes and improvements
│   ├── architecture/       # System design and architecture
│   └── guides/             # Setup and development guides
├── src/
│   ├── app/                # Next.js 13 app directory
│   ├── components/         # Reusable components
│   ├── lib/                # Utilities and libraries
│   └── ...
├── prisma/                 # Database schema and migrations
└── ...
```

## 🤝 Contributing

When adding new documentation:
1. Choose the appropriate category (features/fixes/architecture/guides)
2. Update this README.md with a link
3. Follow the existing documentation structure
4. Keep documentation up-to-date with code changes

## 📞 Support

For questions or issues:
- Check the relevant documentation section
- Review [Common Fixes](./fixes/README.md)
- Consult the [Architecture docs](./architecture/multi-variant-design.md)

---

**Last Updated**: October 3, 2025
**Documentation Version**: 2.0 (Reorganized)
