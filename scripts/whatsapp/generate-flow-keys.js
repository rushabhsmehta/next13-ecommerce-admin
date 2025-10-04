/**
 * Generate RSA-2048 Key Pair for WhatsApp Flow Encryption
 * Run: node scripts/whatsapp/generate-flow-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keyDirectory = path.join(__dirname, '..', '..', 'flow-keys');

// Create directory if it doesn't exist
if (!fs.existsSync(keyDirectory)) {
  fs.mkdirSync(keyDirectory, { recursive: true });
}

console.log('🔐 Generating RSA-2048 key pair for WhatsApp Flow...\n');

// Generate key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Save keys to files
const privateKeyPath = path.join(keyDirectory, 'private.pem');
const publicKeyPath = path.join(keyDirectory, 'public.pem');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('✅ Key pair generated successfully!\n');
console.log(`📁 Private key: ${privateKeyPath}`);
console.log(`📁 Public key: ${publicKeyPath}\n`);

console.log('=== 📋 PUBLIC KEY (Copy this to Meta Flow Builder) ===');
console.log('\x1b[36m%s\x1b[0m', publicKey);

console.log('\n=== ⚠️  IMPORTANT SECURITY NOTES ===');
console.log('\x1b[31m%s\x1b[0m', '1. Store private.pem securely - NEVER commit to Git!');
console.log('\x1b[31m%s\x1b[0m', '2. Add flow-keys/ to .gitignore');
console.log('\x1b[31m%s\x1b[0m', '3. Add WHATSAPP_FLOW_PRIVATE_KEY to .env file\n');

// Base64 encode private key for .env
const privateKeyBase64 = Buffer.from(privateKey).toString('base64');

console.log('=== 🔑 Add to .env ===');
console.log('\x1b[33m%s\x1b[0m', `WHATSAPP_FLOW_PRIVATE_KEY="${privateKeyBase64}"\n`);

console.log('=== 📝 Next Steps ===');
console.log('1. Copy the PUBLIC KEY above');
console.log('2. Go to Meta Flow Builder > Sign public key tab');
console.log('3. Paste the public key and click Submit');
console.log('4. Add the WHATSAPP_FLOW_PRIVATE_KEY to your .env file');
console.log('5. Update the endpoint to decrypt incoming requests\n');

// Update .gitignore
const gitignorePath = path.join(__dirname, '..', '..', '.gitignore');
let gitignoreContent = '';

if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
}

if (!gitignoreContent.includes('flow-keys/')) {
  fs.appendFileSync(gitignorePath, '\n# WhatsApp Flow encryption keys\nflow-keys/\n');
  console.log('✅ Added flow-keys/ to .gitignore\n');
}

console.log('🎉 Setup complete! Follow the next steps above.');
