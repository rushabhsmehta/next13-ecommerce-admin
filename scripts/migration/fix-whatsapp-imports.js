/**
 * Fix WhatsApp imports - Replace prisma/prismadb with whatsappPrisma
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/whatsapp/campaigns/[id]/send/route.ts',
  'src/app/api/whatsapp/campaigns/[id]/route.ts',
  'src/app/api/whatsapp/campaigns/[id]/recipients/route.ts',
  'src/app/api/whatsapp/catalog/packages/[packageId]/route.ts',
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace import statement
  if (content.includes("import prisma from '@/lib/prismadb'")) {
    content = content.replace(
      /import prisma from '@\/lib\/prismadb'/g,
      "import whatsappPrisma from '@/lib/whatsapp-prismadb'"
    );
    changed = true;
  }
  
  if (content.includes("import prismadb from '@/lib/prismadb'")) {
    content = content.replace(
      /import prismadb from '@\/lib\/prismadb'/g,
      "import whatsappPrisma from '@/lib/whatsapp-prismadb'"
    );
    changed = true;
  }
  
  // Replace all prisma.whatsApp references
  if (content.match(/\bprisma\.whatsApp/)) {
    content = content.replace(/\bprisma\.whatsApp/g, 'whatsappPrisma.whatsApp');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`ℹ️  No changes: ${file}`);
  }
});

console.log('\n🎉 Done!');
