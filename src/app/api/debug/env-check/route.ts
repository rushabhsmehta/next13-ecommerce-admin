/**
 * Diagnostic Endpoint - Check Environment Variables
 * 
 * This endpoint checks if environment variables are loaded correctly
 * DO NOT deploy to production - for debugging only!
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const privateKey = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
  const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE;

  return NextResponse.json({
    hasPrivateKey: !!privateKey,
    privateKeyLength: privateKey?.length || 0,
    privateKeyStart: privateKey?.substring(0, 50) || 'NOT SET',
    privateKeyEnd: privateKey?.substring(privateKey.length - 50) || 'NOT SET',
    hasPassphrase: !!passphrase,
    passphraseLength: passphrase?.length || 0,
    passphraseValue: passphrase || 'NOT SET', // Remove this in production!
    containsNewlines: privateKey?.includes('\n') || false,
    containsBeginMarker: privateKey?.includes('-----BEGIN RSA PRIVATE KEY-----') || false,
    containsEndMarker: privateKey?.includes('-----END RSA PRIVATE KEY-----') || false,
    containsEncryptedMarker: privateKey?.includes('Proc-Type: 4,ENCRYPTED') || false,
  });
}
