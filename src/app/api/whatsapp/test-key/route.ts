import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Diagnostic endpoint to test if private key is correctly loaded
 * This will help us identify if the issue is with environment variables or decryption logic
 */
export async function GET() {
  try {
    const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE;
    
    if (!privateKeyPem) {
      return NextResponse.json({
        success: false,
        error: 'WHATSAPP_FLOW_PRIVATE_KEY not found in environment',
      }, { status: 500 });
    }
    
    if (!passphrase) {
      return NextResponse.json({
        success: false,
        error: 'WHATSAPP_FLOW_KEY_PASSPHRASE not found in environment',
      }, { status: 500 });
    }

    // Test 1: Check if key starts and ends correctly
    const keyStart = privateKeyPem.substring(0, 50);
    const keyEnd = privateKeyPem.substring(privateKeyPem.length - 50);
    const hasNewlines = privateKeyPem.includes('\n');
    const keyLength = privateKeyPem.length;
    
    // Test 2: Try to create private key object
    let privateKeyCreated = false;
    let privateKeyError = '';
    try {
      crypto.createPrivateKey({
        key: privateKeyPem,
        passphrase
      });
      privateKeyCreated = true;
    } catch (err: any) {
      privateKeyError = err.message;
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        keyFound: true,
        passphraseFound: true,
        keyLength,
        hasNewlines,
        keyStart,
        keyEnd,
        privateKeyCreated,
        privateKeyError: privateKeyError || 'None',
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
