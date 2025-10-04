/**
 * Generate RSA-2048 Key Pair for WhatsApp Flow Encryption
 * Following Meta's Official Documentation
 * https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
 * 
 * This script generates an ENCRYPTED private key with passphrase protection
 * Similar to: WhatsApp-Flows-Tools/examples/endpoint/nodejs/basic/src/keyGenerator.js
 * 
 * Usage: node scripts/whatsapp/generate-flow-keys-secure-node.js YourSecurePassphrase123
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Get passphrase from command line argument
const passphrase = process.argv[2];

if (!passphrase) {
  console.error('\n❌ Error: Passphrase is required!');
  console.log('\nUsage:');
  console.log('  node scripts/whatsapp/generate-flow-keys-secure-node.js "YourSecurePassphrase123"\n');
  console.log('Example:');
  console.log('  node scripts/whatsapp/generate-flow-keys-secure-node.js "MySecret!2024@Flow"\n');
  process.exit(1);
}

console.log('\n================================================');
console.log('WhatsApp Flow RSA Key Generator (Secure Version)');
console.log('Following Meta\'s Official Documentation');
console.log('================================================\n');

console.log('Generating RSA-2048 key pair with passphrase protection...\n');

try {
  // Generate key pair with passphrase encryption (following Meta's official example)
  const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
      cipher: 'des-ede3-cbc',  // DES3 encryption (Meta's requirement)
      passphrase,
    },
  });

  console.log('[OK] Key pair generated successfully!\n');

  // Create directory for keys
  const keyDirectory = path.join(process.cwd(), 'flow-keys');
  if (!fs.existsSync(keyDirectory)) {
    fs.mkdirSync(keyDirectory, { recursive: true });
  }

  // Save keys to files
  fs.writeFileSync(path.join(keyDirectory, 'private.pem'), keyPair.privateKey);
  fs.writeFileSync(path.join(keyDirectory, 'public.pem'), keyPair.publicKey);

  console.log('Files created:');
  console.log('  [*] Private key: flow-keys/private.pem (ENCRYPTED)');
  console.log('  [*] Public key:  flow-keys/public.pem\n');

  // Display public key
  console.log('================================================');
  console.log('PUBLIC KEY (Copy to Meta Flow Builder)');
  console.log('================================================');
  console.log(keyPair.publicKey);

  // Display private key
  console.log('================================================');
  console.log('PRIVATE KEY (Encrypted with your passphrase)');
  console.log('================================================');
  console.log(keyPair.privateKey);

  // Display .env format
  console.log('================================================');
  console.log('Add to .env file');
  console.log('================================================\n');
  
  console.log('# WhatsApp Flow Encryption Keys');
  console.log('# Private key is encrypted - requires passphrase to use\n');
  console.log(`WHATSAPP_FLOW_PRIVATE_KEY="${keyPair.privateKey.trim()}"`);
  console.log('\n# The passphrase you used when generating the key');
  console.log(`WHATSAPP_FLOW_KEY_PASSPHRASE="${passphrase}"\n`);

  // Security notes
  console.log('\n================================================');
  console.log('SECURITY NOTES');
  console.log('================================================');
  console.log('[OK] Private key is ENCRYPTED with your passphrase');
  console.log('[OK] Follows Meta\'s official documentation');
  console.log('[OK] Matches WhatsApp-Flows-Tools examples\n');
  console.log('[!] Store private key in .env file');
  console.log('[!] Store passphrase separately (different secret)');
  console.log('[!] NEVER commit .env to Git');
  console.log('[!] Add flow-keys/ to .gitignore\n');
  console.log('[*] For production: Use encrypted secrets manager');
  console.log('   - Vercel: Environment Variables (encrypted)');
  console.log('   - Railway: Secret Variables');
  console.log('   - AWS: Secrets Manager\n');

  // Next steps
  console.log('================================================');
  console.log('NEXT STEPS');
  console.log('================================================');
  console.log('1. Copy the PUBLIC KEY above');
  console.log('2. Go to Meta Flow Builder > Your Flow > ... > Endpoint');
  console.log('3. Click [Sign public key] and paste the PUBLIC KEY');
  console.log('4. Copy the .env configuration above');
  console.log('5. Add to your .env.local file');
  console.log('6. Test your endpoint\n');

  // Check .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('flow-keys')) {
      console.log('[!] Warning: flow-keys/ is not in .gitignore');
      console.log('   Run: echo flow-keys/ >> .gitignore\n');
    } else {
      console.log('[OK] flow-keys/ is already in .gitignore\n');
    }
  }

  console.log('[OK] Done!\n');

} catch (error) {
  console.error('\n❌ Error generating keys:', error.message);
  process.exit(1);
}
