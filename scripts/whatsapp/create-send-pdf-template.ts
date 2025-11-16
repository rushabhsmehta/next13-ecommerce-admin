import 'dotenv/config';
import { createTemplate } from '../../src/lib/whatsapp-templates';
import { uploadWhatsAppTemplateMediaBuffer } from '../../src/lib/whatsapp-media';

const DOCUMENT_URL =
  'https://pub-cb78526d4e6f4dbf8324f9c3a1b07eba.r2.dev/whatsapp/templates/send-pdf/Ashwathy_-_VIETNAM___PHU_QUOC_ULTIMATE_HOLIDAY___4N-5D_Luxury-1763291382422-e99c32abe0154a2192e5db02c18581c6.pdf';
const TEMPLATE_NAME = 'send_pdf';
const TEMPLATE_LANGUAGE = 'en_US';
const TEMPLATE_CATEGORY = 'UTILITY';
const BODY_TEXT = 'Hi';
const FOOTER_TEXT = 'Aagam Holidays';

async function downloadDocument(url: string): Promise<{ buffer: Buffer; fileName: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF (${response.status}): ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const pathname = new URL(url).pathname;
  const fileName = pathname.split('/').filter(Boolean).pop() || 'send-pdf-sample.pdf';

  if (!buffer.length) {
    throw new Error('Downloaded PDF is empty');
  }

  return { buffer, fileName };
}

async function main() {
  console.log('📄 Downloading PDF sample...');
  const { buffer, fileName } = await downloadDocument(DOCUMENT_URL);
  console.log(`   • File: ${fileName}`);
  console.log(`   • Size: ${(buffer.length / 1024).toFixed(2)} KB`);

  console.log('\n☁️  Uploading PDF to WhatsApp template media endpoint...');
  const { mediaId } = await uploadWhatsAppTemplateMediaBuffer({
    buffer,
    fileName,
    mimeType: 'application/pdf',
    mediaType: 'document',
  });
  console.log(`   • Media handle: ${mediaId}`);

  console.log('\n🧱 Creating template with document header...');
  const templateResponse = await createTemplate({
    name: TEMPLATE_NAME,
    language: TEMPLATE_LANGUAGE,
    category: TEMPLATE_CATEGORY,
    components: [
      {
        type: 'HEADER',
        format: 'DOCUMENT',
        example: {
          header_handle: [mediaId],
        },
      },
      {
        type: 'BODY',
        text: BODY_TEXT,
      },
      {
        type: 'FOOTER',
        text: FOOTER_TEXT,
      },
    ],
  });

  console.log('\n✅ Template submitted to Meta.');
  console.log(`   • Template ID: ${templateResponse.id}`);
  console.log(`   • Status: ${templateResponse.status}`);
  console.log(`   • Category: ${templateResponse.category}`);
}

main().catch((error) => {
  console.error('\n❌ Failed to create send_pdf template');
  console.error(error);
  process.exit(1);
});
