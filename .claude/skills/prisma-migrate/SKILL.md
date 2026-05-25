---
name: prisma-migrate
description: Guide the full Prisma schema change workflow — edit schema, generate client, run migration, update affected code. Requires user confirmation before applying migrations.
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

## Safety (required)

- **Confirm with the user** before `prisma migrate dev` or any migration that touches shared/prod data
- **Never** run `prisma migrate reset`, `db push --force-reset`, or DROP against production
- Safe without confirmation: `prisma format`, `prisma generate`, `prisma validate`

## Steps

### Main schema (`schema.prisma`, MySQL)

1. Edit `schema.prisma`
2. `npx prisma format` and `npx prisma validate`
3. `npx prisma generate`
4. After user approval: `npx prisma migrate dev --name <kebab-case-name>`
5. Update API routes, mobile types, and MCP handlers that use changed models
6. Financial models: update balance logic in payment/receipt/transfer routes if fields affect amounts

### WhatsApp schema (`prisma/whatsapp-schema.prisma`, PostgreSQL)

1. Edit schema file
2. `npx prisma generate --schema=prisma/whatsapp-schema.prisma`
3. After approval: `npx prisma migrate dev --schema=prisma/whatsapp-schema.prisma --name <name>`
4. Update `src/lib/whatsapp-prismadb.ts` consumers

## Important Notes

- Clients: `@prisma/client` (main), `@prisma/whatsapp-client` (WhatsApp)
- `npm run build` / `postinstall` regenerate both clients
- MySQL: no native arrays; use `@db.Text` for long strings
- Check existing `@relation` names before adding new relations
