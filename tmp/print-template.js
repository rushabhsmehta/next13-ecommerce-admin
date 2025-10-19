const { PrismaClient } = require('@prisma/client');

const name = process.argv[2];

if (!name) {
  console.error('Usage: node tmp/print-template.js <templateName>');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const tpl = await prisma.whatsAppTemplate.findUnique({ where: { name } });
    console.log(JSON.stringify(tpl, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
