/**
 * Convert Private Key for Vercel
 * 
 * Converts multi-line private key to single-line format with \n escape characters
 * for proper storage in Vercel environment variables
 */

import fs from 'fs';
import path from 'path';

const privateKeyPath = path.join(process.cwd(), 'flow-keys', 'private.pem');
const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

// Convert actual newlines to \n escape characters
const escapedKey = privateKey.replace(/\n/g, '\\n');

console.log('\n================================================');
console.log('Private Key Converted for Vercel');
console.log('================================================\n');

console.log('📋 Copy this ENTIRE value and paste into Vercel:\n');
console.log(escapedKey);
console.log('\n================================================');
console.log('Instructions:');
console.log('================================================');
console.log('1. Copy the key above (CTRL+A in terminal, then CTRL+C)');
console.log('2. Go to Vercel → Settings → Environment Variables');
console.log('3. Find WHATSAPP_FLOW_PRIVATE_KEY → Click ... → Edit');
console.log('4. Replace the value with the escaped version');
console.log('5. Click Save');
console.log('6. Redeploy');
console.log('================================================\n');
