#!/bin/bash
# Vercel build script to ensure Prisma engines are properly generated
# This script runs during the Vercel build process

echo "🔧 Starting Prisma client generation for Vercel deployment..."

# Generate main Prisma client (MySQL)
echo "📦 Generating main Prisma client (MySQL)..."
npx prisma generate

# Generate WhatsApp Prisma client (PostgreSQL)
echo "📦 Generating WhatsApp Prisma client (PostgreSQL)..."
npx prisma generate --schema=prisma/whatsapp-schema.prisma

# Verify the engines are in place
echo "✅ Verifying Prisma engines..."

# Check main client
if [ -d "node_modules/.prisma/client" ]; then
    echo "✅ Main Prisma client generated successfully"
    ls -la node_modules/.prisma/client/libquery_engine-* || echo "⚠️  Main engine binary not found"
else
    echo "❌ Main Prisma client not found!"
    exit 1
fi

# Check WhatsApp client
if [ -d "node_modules/@prisma/whatsapp-client" ]; then
    echo "✅ WhatsApp Prisma client generated successfully"
    ls -la node_modules/@prisma/whatsapp-client/libquery_engine-* || echo "⚠️  WhatsApp engine binary not found"
else
    echo "❌ WhatsApp Prisma client not found!"
    exit 1
fi

# Also check .prisma directory for whatsapp client
if [ -d "node_modules/.prisma/whatsapp-client" ]; then
    echo "✅ WhatsApp Prisma client also in .prisma directory"
    ls -la node_modules/.prisma/whatsapp-client/libquery_engine-* || true
fi

echo "🎉 All Prisma clients generated successfully!"
exit 0
