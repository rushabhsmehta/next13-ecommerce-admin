---
name: prisma-migrate
description: Guide the full Prisma schema change workflow — edit schema, generate client, run migration, update affected code.
disable-model-invocation: true
allowed-tools: Bash(npx prisma*)
argument-hint: [schema-name]
---

# Prisma Schema Change Workflow

Guide the full workflow when modifying the Prisma schema.

## Input

- **$0** — Which schema (optional, defaults to main): `main` or `whatsapp`

The user will describe what models/fields to add, modify, or remove.

## Live Schema State

Main schema models:
```
!`grep "^model " schema.prisma | head -30`
```

Recent migrations:
```
!`ls -t prisma/migrations/ 2>/dev/null | head -5`
```

## Steps

### For Main Schema (`schema.prisma`)

1. **Edit `schema.prisma`** at the project root with the requested changes
2. **Generate the client**: `npx prisma generate`
3. **Create a migration**: `npx prisma migrate dev --name <descriptive-name>`
   - Use kebab-case for migration names (e.g., `add-transfer-notes`, `update-sale-detail-fields`)
   - If migration fails due to data issues, report them clearly
4. **Verify** the generated client types match expectations
5. **Update any affected API routes or components** that use the changed models

### For WhatsApp Schema (`prisma/whatsapp-schema.prisma`)

1. **Edit `prisma/whatsapp-schema.prisma`**
2. **Generate the client**: `npx prisma generate --schema=prisma/whatsapp-schema.prisma`
3. **Create a migration**: `npx prisma migrate dev --schema=prisma/whatsapp-schema.prisma --name <name>`
4. **Verify** and update affected code

## Important Notes

- Main schema uses MySQL — some features differ from PostgreSQL (e.g., no arrays, use `@db.Text` for long strings)
- WhatsApp schema uses PostgreSQL
- Both clients are separate: `@prisma/client` (main) and `@prisma/whatsapp-client` (WhatsApp)
- After schema changes, `npm run build` will regenerate both clients
- Always check for existing relations before adding new ones
- Financial models (`BankAccount`, `CashAccount`, `SaleDetail`, `PurchaseDetail`) have balance update logic in API routes — any schema changes here need corresponding API route updates
