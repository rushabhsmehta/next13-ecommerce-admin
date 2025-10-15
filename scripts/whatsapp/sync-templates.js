require('dotenv').config();
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { syncWhatsAppTemplates } = require('../../src/lib/whatsapp');
  const result = await syncWhatsAppTemplates();
  console.log('Synced WhatsApp templates:', result);
}

main()
  .catch((error) => {
    console.error('Failed to sync WhatsApp templates:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
